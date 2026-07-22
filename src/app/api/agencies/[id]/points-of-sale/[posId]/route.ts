import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser, can } from "@/lib/authz";
import { assertWithinScope } from "@/lib/scope";
import { ApiError } from "@/lib/api/errors";

const POINTS_DE_VENTE_MENU_URL = "/dashboard/agences/[id]/points-de-vente";

function errorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; posId: string }> }
) {
  try {
    const user = await requireUser();
    const { id: agencyId, posId } = await params;

    await assertWithinScope(user, { agencyIds: [agencyId] });

    const canUpdate = await can(POINTS_DE_VENTE_MENU_URL, "update");
    if (!canUpdate) {
      return NextResponse.json(
        { error: "Vous n'avez pas le droit de modifier un point de vente." },
        { status: 403 }
      );
    }

    const existing = await prisma.pointOfSale.findFirst({
      where: { id: posId, agencyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Point de vente introuvable." }, { status: 404 });
    }

    const body = await request.json();
    const { name, address, phone, active } = body as {
      name?: string;
      address?: string | null;
      phone?: string | null;
      active?: boolean;
    };

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Le nom du point de vente est requis." }, { status: 400 });
    }

    const pointOfSale = await prisma.pointOfSale.update({
      where: { id: posId },
      data: {
        name: name.trim(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        active: active !== undefined ? active : existing.active,
      },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        active: true,
      },
    });

    return NextResponse.json({ pointOfSale });
  } catch (error) {
    return errorResponse(error, "Une erreur est survenue lors de la modification.");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; posId: string }> }
) {
  try {
    const user = await requireUser();
    const { id: agencyId, posId } = await params;

    await assertWithinScope(user, { agencyIds: [agencyId] });

    const canDelete = await can(POINTS_DE_VENTE_MENU_URL, "delete");
    if (!canDelete) {
      return NextResponse.json(
        { error: "Vous n'avez pas le droit de supprimer un point de vente." },
        { status: 403 }
      );
    }

    const existing = await prisma.pointOfSale.findFirst({
      where: { id: posId, agencyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Point de vente introuvable." }, { status: 404 });
    }

    await prisma.pointOfSale.delete({
      where: { id: posId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Une erreur est survenue lors de la suppression.");
  }
}
