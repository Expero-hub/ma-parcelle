import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  formatPaginatedResponse,
  parsePaginationParams,
} from "@/lib/api/pagination";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  await requirePermission("read");

  const { page, limit, skip, search } = parsePaginationParams(request);

  const where: any = { deletedAt: null };
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { commune: { contains: search, mode: "insensitive" } },
      { district: { contains: search, mode: "insensitive" } },
      { department: { contains: search, mode: "insensitive" } },
      { fullAddress: { contains: search, mode: "insensitive" } },
    ];
  }

  const [zones, total] = await Promise.all([
    prisma.zone.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.zone.count({ where }),
  ]);

  return NextResponse.json(
    formatPaginatedResponse(zones, total, { page, limit }),
  );
}

export async function POST(request: Request) {
  await requirePermission("create");

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Corps de requete invalide." },
      { status: 400 },
    );
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const commune = typeof body.commune === "string" ? body.commune.trim() : "";

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
      : null;
  const longitude =
    typeof body.longitude === "number" && Number.isFinite(body.longitude)
      ? body.longitude
      : null;

  const zone = await prisma.zone.create({
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

  return NextResponse.json({ zone }, { status: 201 });
}
