import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser, can } from "@/lib/authz";
import { assertWithinScope } from "@/lib/scope";
import { ApiError } from "@/lib/api/errors";
import { parsePaginationParams, formatPaginatedResponse } from "@/lib/api/pagination";

const POINTS_DE_VENTE_MENU_URL = "/dashboard/agences/[id]/points-de-vente";

function errorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: agencyId } = await params;

    await assertWithinScope(user, { agencyIds: [agencyId] });

    const { page, limit, skip, search } = parsePaginationParams(request);

    const where: any = {
      agencyId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [pointsOfSale, total] = await Promise.all([
      prisma.pointOfSale.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          active: true,
          members: {
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
          },
        },
      }),
      prisma.pointOfSale.count({ where }),
    ]);

    // Retourne le format paginé standard
    return NextResponse.json(formatPaginatedResponse(pointsOfSale, total, { page, limit }));
  } catch (error) {
    return errorResponse(error, "Impossible de récupérer les points de vente.");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: agencyId } = await params;

    await assertWithinScope(user, { agencyIds: [agencyId] });

    const canCreate = await can(POINTS_DE_VENTE_MENU_URL, "create");
    if (!canCreate) {
      return NextResponse.json(
        { error: "Vous n'avez pas le droit de créer un point de vente." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, address, phone } = body as { name?: string; address?: string; phone?: string };

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Le nom du point de vente est requis." }, { status: 400 });
    }

    const pointOfSale = await prisma.pointOfSale.create({
      data: {
        name: name.trim(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        agencyId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        active: true,
      },
    });

    return NextResponse.json({ pointOfSale }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Une erreur est survenue lors de la création.");
  }
}
