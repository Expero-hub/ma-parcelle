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

export async function POST(
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
        { error: "Vous n'avez pas le droit d'assigner du personnel." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json({ error: "L'identifiant de l'utilisateur est requis." }, { status: 400 });
    }

    // Vérifie que l'utilisateur est bien membre de l'agence parente
    const agencyMember = await prisma.agencyMember.findUnique({
      where: {
        userId_agencyId: { userId, agencyId },
      },
    });
    if (!agencyMember) {
      return NextResponse.json(
        { error: "L'utilisateur doit être membre de l'agence pour être affecté à son point de vente." },
        { status: 400 }
      );
    }

    // Crée l'affectation
    const pointOfSaleMember = await prisma.pointOfSaleMember.create({
      data: {
        userId,
        pointOfSaleId: posId,
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ member: pointOfSaleMember }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Une erreur est survenue lors de l'assignation.");
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

    const canUpdate = await can(POINTS_DE_VENTE_MENU_URL, "update");
    if (!canUpdate) {
      return NextResponse.json(
        { error: "Vous n'avez pas le droit de dissocier du personnel." },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "L'identifiant de l'utilisateur (userId) est requis." }, { status: 400 });
    }

    await prisma.pointOfSaleMember.delete({
      where: {
        userId_pointOfSaleId: {
          userId,
          pointOfSaleId: posId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Une erreur est survenue lors de la dissociation.");
  }
}
