import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/authz";
import { parsePaginationParams, formatPaginatedResponse } from "@/lib/api/pagination";
import { ApiError, toErrorResponse } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    if (!(await can("/dashboard/importations/fichiers", "read"))) {
      throw new ApiError(403, "FORBIDDEN", "Droit insuffisant pour lire les fichiers.");
    }

    const { page, limit, skip } = parsePaginationParams(req);
    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    const type = url.searchParams.get("type") || "";
    const parcelle = url.searchParams.get("parcelle") || "";
    const client = url.searchParams.get("client") || "";
    const agency = url.searchParams.get("agency") || "";

    const where: any = {};

    if (q) {
      where.name = { contains: q, mode: "insensitive" };
    }

    if (type) {
      where.type = type.toLowerCase();
    }

    const conditions: any[] = [];

    if (parcelle) {
      const pFilter = { reference: { contains: parcelle, mode: "insensitive" } };
      conditions.push({
        OR: [
          { contracts: { some: { parcelle: pFilter } } },
          { installments: { some: { contract: { parcelle: pFilter } } } },
          { payments: { some: { installment: { contract: { parcelle: pFilter } } } } }
        ]
      });
    }

    if (client) {
      const cFilter = {
        OR: [
          { name: { contains: client, mode: "insensitive" } },
          { email: { contains: client, mode: "insensitive" } }
        ]
      };
      conditions.push({
        OR: [
          { contracts: { some: { user: cFilter } } },
          { installments: { some: { contract: { user: cFilter } } } },
          { payments: { some: { installment: { contract: { user: cFilter } } } } }
        ]
      });
    }

    if (agency) {
      conditions.push({
        OR: [
          { contracts: { some: { agencyId: agency } } },
          { installments: { some: { contract: { agencyId: agency } } } },
          { payments: { some: { installment: { contract: { agencyId: agency } } } } }
        ]
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const [files, total] = await Promise.all([
      prisma.importFile.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          uploadedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.importFile.count({ where }),
    ]);

    return NextResponse.json(formatPaginatedResponse(files, total, { page, limit }));
  } catch (err) {
    return toErrorResponse(err);
  }
}
