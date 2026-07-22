import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { can } from "@/lib/authz";
import { menuSchema } from "@/lib/validations/menu";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
  if (!(await can("/dashboard/menus", "create"))) {
    throw new ApiError(403, "FORBIDDEN", "Vous n'avez pas le droit de creer des menus.");
  }

  const body = menuSchema.parse(await req.json());
  const targetModule = await prisma.module.findUnique({
    where: { id: body.moduleId },
    select: { id: true },
  });
  if (!targetModule) {
    throw new ApiError(422, "INVALID_MODULE", "Module introuvable.", { moduleId: "Module invalide." });
  }

  if (body.parentId) {
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

  const lastMenu = await prisma.menu.findFirst({
    where: { moduleId: body.moduleId, parentId: body.parentId ?? null },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const menu = await prisma.menu.create({
    data: {
      name: body.name,
      moduleId: body.moduleId,
      parentId: body.parentId ?? null,
      url: body.url ?? null,
      icon: body.icon ?? null,
      order: body.order ?? (lastMenu?.order ?? 0) + 1,
      active: body.active ?? true,
    },
    select: { id: true, name: true },
  });

  revalidatePath("/dashboard/menus");
  revalidatePath("/dashboard/menus/liste");
  revalidateTag("menus:all", "max");
  return Response.json({ data: menu }, { status: 201 });
});
