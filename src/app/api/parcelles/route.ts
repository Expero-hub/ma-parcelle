import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { can } from "@/lib/authz";
import { getScopedPointOfSaleIds, type ScopedUser } from "@/lib/scope";
import { parsePaginationParams, formatPaginatedResponse } from "@/lib/api/pagination";

const createParcelleSchema = z.object({
  reference: z.string().min(1, "La référence est requise."),
  area: z.number().positive("La superficie doit être supérieure à 0."),
  price: z.number().nonnegative("Le prix ne peut pas être négatif."),
  minDuration: z.number().int().nonnegative().optional(),
  maxDuration: z.number().int().nonnegative().optional(),
  pointOfSaleId: z.string().min(1, "Le point de vente est requis."),
  zoneId: z.string().min(1, "La zone est requise."),
  description: z.string().optional(),
  geom: z.any().optional(), // GeoJSON polygon or list of coordinates
  images: z.array(z.string()).optional().default([]),
});

export async function GET(req: NextRequest) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
    if (!(await can("/dashboard/parcelles", "read"))) {
      throw new ApiError(403, "FORBIDDEN", "Droit insuffisant.");
    }

    const { page, limit, skip, search } = parsePaginationParams(req);
    const url = new URL(req.url);
    const pointOfSaleFilter = url.searchParams.get("pointOfSaleId") || "";
    const statusFilter = url.searchParams.get("status") || "";

    const user = session.user as ScopedUser;
    const scopedPosIds = await getScopedPointOfSaleIds(user);

    const where: any = {
      deletedAt: null,
    };

    // Apply points of sale scoping
    if (scopedPosIds !== null) {
      where.pointOfSaleId = { in: scopedPosIds };
    }

    // Apply query filters
    if (pointOfSaleFilter) {
      if (scopedPosIds !== null && !scopedPosIds.includes(pointOfSaleFilter)) {
        throw new ApiError(403, "OUT_OF_SCOPE", "Point de vente hors de votre périmètre.");
      }
      where.pointOfSaleId = pointOfSaleFilter;
    }

    if (statusFilter) {
      where.status = statusFilter;
    }

    if (search) {
      where.reference = { contains: search, mode: "insensitive" };
    }

    const [parcelles, total] = await Promise.all([
      prisma.parcelle.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          reference: true,
          area: true,
          price: true,
          status: true,
          minDuration: true,
          maxDuration: true,
          zone: {
            select: {
              commune: true,
              district: true,
              department: true,
              fullAddress: true,
            },
          },
          pointOfSale: {
            select: {
              id: true,
              name: true,
              agency: { select: { name: true } },
            },
          },
          images: {
            select: { path: true, isPrimary: true },
            orderBy: { order: "asc" },
          },
          contracts: {
            where: { deletedAt: null, status: { not: "CANCELLED" } },
            select: {
              id: true,
              totalAmount: true,
              installments: {
                select: {
                  payments: { select: { amount: true } },
                },
              },
            },
          },
        },
      }),
      prisma.parcelle.count({ where }),
    ]);

    // Format rows with recovery rate calculation
    const rows = parcelles.map((p) => {
      let recoveryRate = 0;
      const activeContract = p.contracts[0]; // pick latest active contract
      if (activeContract) {
        let paid = 0;
        for (const inst of activeContract.installments) {
          for (const pay of inst.payments) {
            paid += Number(pay.amount);
          }
        }
        const totalAmount = Number(activeContract.totalAmount);
        if (totalAmount > 0) {
          recoveryRate = Math.round((paid / totalAmount) * 100);
        }
      }

      const primaryImage = p.images.find((img) => img.isPrimary) || p.images[0];

      return {
        id: p.id,
        reference: p.reference,
        area: Number(p.area),
        price: Number(p.price),
        status: p.status,
        minDuration: p.minDuration ?? 1,
        maxDuration: p.maxDuration ?? 5,
        commune: p.zone.commune ?? "",
        district: p.zone.district ?? "",
        department: p.zone.department ?? "",
        fullAddress: p.zone.fullAddress ?? "",
        pointOfSaleName: p.pointOfSale?.name ?? "—",
        agencyName: p.pointOfSale?.agency.name ?? "—",
        imageUrl: primaryImage?.path ?? null,
        recoveryRate,
      };
    });

    return NextResponse.json(formatPaginatedResponse(rows, total, { page, limit }));
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
    if (!(await can("/dashboard/parcelles", "create"))) {
      throw new ApiError(403, "FORBIDDEN", "Droit insuffisant.");
    }

    const body = createParcelleSchema.parse(await req.json());
    const user = session.user as ScopedUser;
    const scopedPosIds = await getScopedPointOfSaleIds(user);

    if (scopedPosIds !== null && !scopedPosIds.includes(body.pointOfSaleId)) {
      throw new ApiError(403, "OUT_OF_SCOPE", "Point de vente hors de votre périmètre.");
    }

    // Verify reference uniqueness
    const existing = await prisma.parcelle.findUnique({
      where: { reference: body.reference },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError(400, "DUPLICATE_REFERENCE", "Cette référence de parcelle existe déjà.");
    }

    // Create the parcel with images
    const created = await prisma.$transaction(async (tx) => {
      const p = await tx.parcelle.create({
        data: {
          reference: body.reference,
          area: body.area,
          price: body.price,
          minDuration: body.minDuration,
          maxDuration: body.maxDuration,
          pointOfSaleId: body.pointOfSaleId,
          zoneId: body.zoneId,
          description: body.description,
          geom: body.geom,
          createdById: user.id,
        },
      });

      if (body.images.length > 0) {
        await Promise.all(
          body.images.map((imgUrl, idx) =>
            tx.parcelleImage.create({
              data: {
                parcelleId: p.id,
                path: imgUrl,
                isPrimary: idx === 0,
                order: idx,
              },
            })
          )
        );
      }

      return p;
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
