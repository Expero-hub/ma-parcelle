import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { can } from "@/lib/authz";
import { menuSchema } from "@/lib/validations/menu";

async function requireMenuAccess(req: NextRequest, action: "update" | "delete") {
  assertSameOrigin(req);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
  if (!(await can("/dashboard/menus", action))) {
    throw new ApiError(403, "FORBIDDEN", "Droit insuffisant.");
  }
}

function revalidateMenus() {
  revalidatePath("/dashboard/menus");
  revalidatePath("/dashboard/menus/liste");
  revalidateTag("menus:all", "max");
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireMenuAccess(req, "update");
    const { id } = await ctx.params;
    const body = menuSchema.parse(await req.json());

    const existing = await prisma.menu.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Menu introuvable.");

    const targetModule = await prisma.module.findUnique({
      where: { id: body.moduleId },
      select: { id: true },
    });
    if (!targetModule) {
      throw new ApiError(422, "INVALID_MODULE", "Module introuvable.", { moduleId: "Module invalide." });
    }

    if (body.parentId) {
      if (body.parentId === id) {
        throw new ApiError(422, "SELF_PARENT", "Un menu ne peut pas etre son propre parent.", {
          parentId: "Parent invalide.",
        });
      }
      const parent = await prisma.menu.findUnique({
        where: { id: body.parentId },
        select: { id: true, moduleId: true },
      });
      if (!parent) {
        throw new ApiError(422, "INVALID_PARENT", "Menu parent introuvable.", { parentId: "Parent invalide." });
      }
      if (parent.moduleId !== body.moduleId) {
        throw new ApiError(422, "INVALID_PARENT_MODULE", "Le parent doit appartenir au meme module.", {
          parentId: "Selectionnez un parent du meme module.",
        });
      }
    }

    const menu = await prisma.menu.update({
      where: { id },
      data: {
        name: body.name,
        moduleId: body.moduleId,
        parentId: body.parentId ?? null,
        url: body.url ?? null,
        icon: body.icon ?? null,
        order: body.order,
        active: body.active,
      },
      select: { id: true, name: true, active: true },
    });

    revalidateMenus();
    return Response.json({ data: menu });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireMenuAccess(req, "delete");
    const { id } = await ctx.params;

    const existing = await prisma.menu.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Menu introuvable.");

    await prisma.menu.update({
      where: { id },
      data: { active: false },
    });

    revalidateMenus();
    return Response.json({ data: { id, active: false } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
