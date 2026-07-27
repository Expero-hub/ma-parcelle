import { headers } from "next/headers";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { can } from "@/lib/authz";
import { getScopedAgencyIds, type ScopedUser } from "@/lib/scope";
import { createAgencySchema } from "@/lib/validations/org";
import { parsePaginationParams, formatPaginatedResponse } from "@/lib/api/pagination";

async function requireSession() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
  return session.user as ScopedUser;
}

async function getScopedAgencyWhere(user: ScopedUser) {
  const role = user.role ?? "user";
  if (role === "admin" || role === "staff") return { deletedAt: null };
  const agencyIds = (await getScopedAgencyIds(user)) ?? [];
  return { deletedAt: null, id: { in: agencyIds } };
}

export const GET = route(async (req: NextRequest) => {
  const user = await requireSession();
  if (!(await can("/dashboard/agences", "read"))) {
    throw new ApiError(403, "FORBIDDEN", "Vous n'avez pas le droit de consulter les agences.");
  }

  const { page, limit, skip, search } = parsePaginationParams(req);
  const scopedWhere = await getScopedAgencyWhere(user);

  const where: any = {
    ...scopedWhere,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
    ];
  }

  const [agencies, total] = await Promise.all([
    prisma.agency.findMany({
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
        _count: { select: { pointsOfSale: true, members: true } },
      },
    }),
    prisma.agency.count({ where }),
  ]);

  return Response.json(formatPaginatedResponse(agencies, total, { page, limit }));
});

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requireSession();
  if (!(await can("/dashboard/agences", "create"))) {
    throw new ApiError(403, "FORBIDDEN", "Vous n'avez pas le droit de créer des agences.");
  }

  const body = createAgencySchema.parse(await req.json());

  const agency = await prisma.$transaction(async (tx) => {
    const created = await tx.agency.create({
      data: body,
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        active: true,
      },
    });

    if ((user.role ?? "user") !== "admin") {
      await tx.agencyMember.create({
        data: { userId: user.id, agencyId: created.id },
      });
    }

    return created;
  });

  return Response.json({ data: agency }, { status: 201 });
});
