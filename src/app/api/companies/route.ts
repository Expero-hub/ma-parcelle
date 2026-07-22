import { headers } from "next/headers";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { can } from "@/lib/authz";
import { getScopedAgencyIds, type ScopedUser } from "@/lib/scope";
import { createCompanySchema } from "@/lib/validations/org";
import { parsePaginationParams, formatPaginatedResponse } from "@/lib/api/pagination";

async function requireSession() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
  return session.user;
}

async function getScopedCompanyWhere(user: ScopedUser) {
  return { deletedAt: null };
}

export const GET = route(async (req: NextRequest) => {
  const user = (await requireSession()) as ScopedUser;
  if (!(await can("/dashboard/compagnies", "read"))) {
    throw new ApiError(403, "FORBIDDEN", "Vous n'avez pas le droit de consulter les compagnies.");
  }

  const { page, limit, skip, search } = parsePaginationParams(req);
  const scopedWhere = await getScopedCompanyWhere(user);

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

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
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
        _count: { select: { users: true } },
      },
    }),
    prisma.company.count({ where }),
  ]);

  const mapped = companies.map((c) => ({
    id: c.id,
    name: c.name,
    address: c.address,
    phone: c.phone,
    active: c.active,
    usersCount: c._count.users,
  }));

  return Response.json(formatPaginatedResponse(mapped, total, { page, limit }));
});

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requireSession();
  if (!(await can("/dashboard/compagnies", "create"))) {
    throw new ApiError(403, "FORBIDDEN", "Vous n'avez pas le droit de créer des compagnies.");
  }
  if ((user.role ?? "user") !== "admin") {
    throw new ApiError(403, "ADMIN_ONLY", "Seul un administrateur peut créer une compagnie.");
  }

  const body = createCompanySchema.parse(await req.json());
  const company = await prisma.company.create({
    data: body,
    select: { id: true, name: true, address: true, phone: true, active: true },
  });

  return Response.json({ data: company }, { status: 201 });
});
