import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { can } from "@/lib/authz";
import { profileSchema } from "@/lib/validations/profile";

async function requireProfileAccess(req: NextRequest, action: "update" | "delete") {
  assertSameOrigin(req);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
  if (!(await can("/dashboard/profils", action))) {
    throw new ApiError(403, "FORBIDDEN", "Droit insuffisant.");
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireProfileAccess(req, "update");
    const { id } = await ctx.params;
    const body = profileSchema.parse(await req.json());

    const existing = await prisma.profile.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Profil introuvable.");

    const profile = await prisma.profile.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description || null,
        active: body.active,
      },
      select: { id: true, name: true },
    });

    revalidatePath("/dashboard/profils");
    revalidatePath(`/dashboard/profils/${id}/permissions`);
    revalidateTag(`permissions:${id}`, "max");
    return Response.json({ data: profile });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireProfileAccess(req, "delete");
    const { id } = await ctx.params;

    const profile = await prisma.profile.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, isSystem: true, name: true, users: { select: { id: true }, take: 1 } },
    });
    if (!profile) throw new ApiError(404, "NOT_FOUND", "Profil introuvable.");
    if (profile.isSystem) {
      throw new ApiError(400, "SYSTEM_PROFILE", "Les profils systeme ne peuvent pas etre supprimes.");
    }
    if (profile.users.length > 0) {
      throw new ApiError(409, "PROFILE_IN_USE", "Ce profil est affecte a au moins un utilisateur.");
    }

    await prisma.profile.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });

    revalidatePath("/dashboard/profils");
    revalidateTag(`permissions:${id}`, "max");
    return Response.json({ data: { id, deleted: true } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
