import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { parsePaginationParams, formatPaginatedResponse } from "@/lib/api/pagination";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("read");

    const { id: profileId } = await params;
    const { page, limit, skip, search } = parsePaginationParams(request);

    const profile = await prisma.profile.findFirst({
      where: { id: profileId, deletedAt: null },
      select: { id: true, type: true, name: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
    }

    const isAdminProfile = profile.type === "ADMIN";

    const where: any = { active: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { url: { contains: search, mode: "insensitive" } },
      ];
    }

    const [menus, total] = await Promise.all([
      prisma.menu.findMany({
        where,
        orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          url: true,
          parent: { select: { name: true } },
          module: { select: { name: true } },
          permissions: {
            where: { profileId },
            select: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
            take: 1,
          },
        },
      }),
      prisma.menu.count({ where }),
    ]);

    const rows = menus.map((menu) => {
      const permission = menu.permissions[0];
      const granted =
        isAdminProfile ||
        Boolean(
          permission?.canCreate &&
            permission?.canRead &&
            permission?.canUpdate &&
            permission?.canDelete
        );

      return {
        id: menu.id,
        name: menu.name,
        module: menu.module.name,
        parent: menu.parent?.name ?? "-",
        url: menu.url ?? "-",
        granted,
      };
    });

    return NextResponse.json(formatPaginatedResponse(rows, total, { page, limit }));
  } catch (error) {
    console.error("[GET /api/profiles/[id]/permissions]", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la récupération des droits." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("update");

    const { id: profileId } = await params;
    const body = await request.json();
    const { menuId, grant } = body as { menuId?: string; grant?: boolean };

    if (!menuId || typeof grant !== "boolean") {
      return NextResponse.json(
        { error: "menuId (string) et grant (boolean) sont requis." },
        { status: 400 }
      );
    }

    const profile = await prisma.profile.findFirst({
      where: { id: profileId, deletedAt: null },
      select: { id: true, type: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
    }

    if (profile.type === "ADMIN") {
      return NextResponse.json(
        { error: "Les droits du profil Administrateur ne sont pas modifiables." },
        { status: 403 }
      );
    }

    const permission = await prisma.profilePermission.upsert({
      where: { profileId_menuId: { profileId, menuId } },
      update: {
        canCreate: grant,
        canRead: grant,
        canUpdate: grant,
        canDelete: grant,
      },
      create: {
        profileId,
        menuId,
        canCreate: grant,
        canRead: grant,
        canUpdate: grant,
        canDelete: grant,
      },
    });

    return NextResponse.json({ granted: grant, permission }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/profiles/[id]/permissions]", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la mise à jour des droits." },
      { status: 500 }
    );
  }
}
