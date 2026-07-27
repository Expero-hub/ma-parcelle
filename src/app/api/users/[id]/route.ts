import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { can } from "@/lib/authz";
import { getScopedUserWhere, assertWithinScope } from "@/lib/scope";

const editUserSchema = z.object({
  firstName: z.string().min(1, "Prénom requis.").optional(),
  lastName: z.string().min(1, "Nom requis.").optional(),
  email: z.string().email("Email invalide.").optional(),
  phone: z.string().optional(),
  profileId: z.string().min(1, "Profil requis.").optional(),
  companyId: z.string().optional(),
  agencyIds: z.array(z.string()).optional().default([]),
  active: z.boolean().optional(),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
    if (!(await can("/dashboard/utilisateurs", "read"))) {
      throw new ApiError(403, "FORBIDDEN", "Droit insuffisant.");
    }

    const target = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profileId: true,
        companyId: true,
        active: true,
        agencyMembers: { select: { agencyId: true } },
      },
    });
    if (!target) throw new ApiError(404, "NOT_FOUND", "Utilisateur introuvable.");

    const formatted = {
      id: target.id,
      email: target.email,
      firstName: target.firstName ?? "",
      lastName: target.lastName ?? "",
      phone: target.phone ?? "",
      profileId: target.profileId,
      companyId: target.companyId ?? "",
      agencyIds: target.agencyMembers.map((am) => am.agencyId),
      active: target.active,
    };

    return Response.json({ data: formatted });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
    if (!(await can("/dashboard/utilisateurs", "update"))) {
      throw new ApiError(403, "FORBIDDEN", "Droit insuffisant.");
    }

    const requester = session.user;
    const requesterIsAdmin = (requester.role ?? "user") === "admin";
    const body = editUserSchema.parse(await req.json());

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!target) throw new ApiError(404, "NOT_FOUND", "Utilisateur introuvable.");

    if (!requesterIsAdmin) {
      if (target.role === "admin") throw new ApiError(403, "FORBIDDEN", "Action non autorisée.");
      const where = await getScopedUserWhere(requester);
      const inScope = await prisma.user.findFirst({ where: { AND: [{ id }, where] }, select: { id: true } });
      if (!inScope) throw new ApiError(403, "OUT_OF_SCOPE", "Utilisateur hors de votre périmètre.");
    }

    const isToggleOnly = body.active !== undefined && body.firstName === undefined && body.email === undefined;

    if (isToggleOnly) {
      if (body.active === false) {
        await auth.api.banUser({ body: { userId: id }, headers: h });
        await prisma.user.update({ where: { id }, data: { active: false } });
      } else {
        await auth.api.unbanUser({ body: { userId: id }, headers: h });
        await prisma.user.update({ where: { id }, data: { active: true } });
      }
      return Response.json({ data: { id, active: body.active } });
    }

    // Full edit
    if (!body.profileId) {
      throw new ApiError(400, "BAD_REQUEST", "Le profil est requis.");
    }

    const profile = await prisma.profile.findUnique({
      where: { id: body.profileId },
      select: { type: true },
    });
    if (!profile) {
      throw new ApiError(422, "INVALID_PROFILE", "Profil introuvable.");
    }
    const role = profile.type === "ADMIN" ? "admin" : profile.type === "STAFF" ? "staff" : "user";

    const requesterRole = requester.role ?? "user";
    const isRequesterAdmin = requesterRole === "admin";
    const isRequesterAdminOrStaff = requesterRole === "admin" || requesterRole === "staff";

    if (profile.type === "ADMIN" && !isRequesterAdmin) {
      throw new ApiError(403, "NO_ESCALATION", "Vous ne pouvez pas affecter le profil administrateur.");
    }

    if (!isRequesterAdminOrStaff) {
      await assertWithinScope(requester, {
        agencyIds: body.agencyIds,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: {
          email: body.email,
          name: `${body.firstName} ${body.lastName}`.trim(),
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
          profileId: body.profileId,
          companyId: profile.type === "CLIENT" ? body.companyId : null,
          role: role as "user" | "admin",
        },
      });

      await tx.agencyMember.deleteMany({ where: { userId: id } });
      if (profile.type === "STAFF" && body.agencyIds && body.agencyIds.length > 0) {
        await Promise.all(
          body.agencyIds.map((agencyId) =>
            tx.agencyMember.create({ data: { userId: id, agencyId } })
          )
        );
      }

      return u;
    });

    if (body.active !== undefined) {
      if (body.active === false) {
        await auth.api.banUser({ body: { userId: id }, headers: h }).catch(() => {});
        await prisma.user.update({ where: { id }, data: { active: false } });
      } else {
        await auth.api.unbanUser({ body: { userId: id }, headers: h }).catch(() => {});
        await prisma.user.update({ where: { id }, data: { active: true } });
      }
    }

    return Response.json({ data: { id: updated.id, email: updated.email } });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
    if (!(await can("/dashboard/utilisateurs", "delete"))) {
      throw new ApiError(403, "FORBIDDEN", "Droit insuffisant.");
    }

    const requester = session.user;
    const requesterIsAdmin = (requester.role ?? "user") === "admin";
    const hard = new URL(req.url).searchParams.get("hard") === "true";

    if (id === requester.id) {
      throw new ApiError(400, "SELF_DELETE", "Vous ne pouvez pas vous supprimer vous-même.");
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!target) throw new ApiError(404, "NOT_FOUND", "Utilisateur introuvable.");

    if (!requesterIsAdmin) {
      if (target.role === "admin") throw new ApiError(403, "FORBIDDEN", "Action non autorisée.");
      const where = await getScopedUserWhere(requester);
      const inScope = await prisma.user.findFirst({ where: { AND: [{ id }, where] }, select: { id: true } });
      if (!inScope) throw new ApiError(403, "OUT_OF_SCOPE", "Utilisateur hors de votre périmètre.");
    }

    if (hard) {
      await prisma.user.delete({ where: { id } });
    } else {
      await auth.api.banUser({ body: { userId: id }, headers: h }).catch(() => {});
      await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
    }

    return Response.json({ data: { id, deleted: true, hard } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
