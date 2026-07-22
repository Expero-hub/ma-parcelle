import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("update");

    const { id } = await params;
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Corps de requête invalide." },
        { status: 400 },
      );
    }

    const zone = await prisma.zone.findFirst({
      where: { id, deletedAt: null },
    });

    if (!zone) {
      return NextResponse.json({ error: "Zone introuvable." }, { status: 404 });
    }

    const code = typeof body.code === "string" ? body.code.trim() : zone.code;
    const commune =
      typeof body.commune === "string" ? body.commune.trim() : zone.commune;

    if (!code) {
      return NextResponse.json(
        { error: "Le code de la zone est requis." },
        { status: 400 },
      );
    }
    if (!commune) {
      return NextResponse.json(
        { error: "La commune est requise." },
        { status: 400 },
      );
    }

    const latitude =
      typeof body.latitude === "number" && Number.isFinite(body.latitude)
        ? body.latitude
        : zone.latitude;
    const longitude =
      typeof body.longitude === "number" && Number.isFinite(body.longitude)
        ? body.longitude
        : zone.longitude;

    const updated = await prisma.zone.update({
      where: { id },
      data: {
        code,
        commune,
        fullAddress:
          typeof body.fullAddress === "string" && body.fullAddress.trim()
            ? body.fullAddress.trim()
            : null,
        department:
          typeof body.department === "string" && body.department.trim()
            ? body.department.trim()
            : null,
        district:
          typeof body.district === "string" && body.district.trim()
            ? body.district.trim()
            : null,
        latitude,
        longitude,
      },
    });

    return NextResponse.json({ zone: updated }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/zones/[id]]", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la mise à jour." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("delete");

    const { id } = await params;

    const zone = await prisma.zone.findFirst({
      where: { id, deletedAt: null },
    });

    if (!zone) {
      return NextResponse.json({ error: "Zone introuvable." }, { status: 404 });
    }

    await prisma.zone.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: "Zone supprimée." }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/zones/[id]]", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la suppression." },
      { status: 500 },
    );
  }
}
