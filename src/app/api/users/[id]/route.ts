import { headers } from "next/headers";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { can } from "@/lib/authz";
import { getScopedUserWhere } from "@/lib/scope";
import { toggleUserSchema } from "@/lib/validations/auth";

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
    const body = toggleUserSchema.parse(await req.json());

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!target) throw new ApiError(404, "NOT_FOUND", "Utilisateur introuvable.");

    if (!requesterIsAdmin) {
      if (target.role === "admin") throw new ApiError(403, "FORBIDDEN", "Action non autorisée.");
      const where = await getScopedUserWhere(requester);
      const inScope = await prisma.user.findFirst({ where: { AND: [{ id }, where] }, select: { id: true } });
      if (!inScope) throw new ApiError(403, "OUT_OF_SCOPE", "Utilisateur hors de votre périmètre.");
    }

    if (body.active === false) {
      await auth.api.banUser({ body: { userId: id }, headers: h });
      await prisma.user.update({ where: { id }, data: { active: false } });
    } else {
      await auth.api.unbanUser({ body: { userId: id }, headers: h });
      await prisma.user.update({ where: { id }, data: { active: true } });
    }

    return Response.json({ data: { id, active: body.active } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
