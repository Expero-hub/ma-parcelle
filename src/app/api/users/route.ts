import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { can } from "@/lib/authz";
import { assertWithinScope, getScopedUserWhere, type ScopedUser } from "@/lib/scope";
import { createUserSchema } from "@/lib/validations/auth";
import { parsePaginationParams, formatPaginatedResponse } from "@/lib/api/pagination";

/** Mot de passe temporaire aléatoire fort, jamais transmis (l'utilisateur le remplace via le lien). */
function randomPassword(): string {
  return randomBytes(24).toString("base64url") + "aA1!";
}

export const GET = route(async (req: NextRequest) => {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
  if (!(await can("/dashboard/utilisateurs", "read"))) {
    throw new ApiError(403, "FORBIDDEN", "Vous n'avez pas le droit de consulter les utilisateurs.");
  }

  const { page, limit, skip, search } = parsePaginationParams(req);
  const url = new URL(req.url);
  const profileFilter = url.searchParams.get("profile") || "";
  const clientOnly = url.searchParams.get("clientOnly") === "true";

  const scopedWhere = await getScopedUserWhere(session.user as ScopedUser);
  const where: any = {
    ...scopedWhere,
    deletedAt: null,
  };

  if (clientOnly) {
    where.profile = { type: "CLIENT" };
  } else {
    if (profileFilter) {
      where.profile = { name: profileFilter, type: { not: "CLIENT" } };
    } else {
      where.profile = { type: { not: "CLIENT" } };
    }
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        banned: true,
        profile: { select: { name: true } },
        agencyMembers: { select: { agency: { select: { name: true } } } },
        posMembers: { select: { pointOfSale: { select: { name: true } } } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const rows = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    profile: u.profile?.name ?? "—",
    scopes: [
      ...u.agencyMembers.map((m) => m.agency.name),
      ...u.posMembers.map((m) => m.pointOfSale.name),
    ],
    active: u.active && !u.banned,
  }));

  return Response.json(formatPaginatedResponse(rows, total, { page, limit }));
});

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
  if (!(await can("/dashboard/utilisateurs", "create"))) {
    throw new ApiError(403, "FORBIDDEN", "Vous n'avez pas le droit de créer des utilisateurs.");
  }

  const creator = session.user;
  const creatorIsAdmin = (creator.role ?? "user") === "admin";
  const body = createUserSchema.parse(await req.json());

  const profile = await prisma.profile.findUnique({
    where: { id: body.profileId },
    select: { type: true },
  });
  if (!profile) {
    throw new ApiError(422, "INVALID_PROFILE", "Profil introuvable.", { profileId: "Profil invalide." });
  }
  const role = profile.type === "ADMIN" ? "admin" : profile.type === "STAFF" ? "staff" : "user";

  if (!creatorIsAdmin) {
    if (profile.type === "ADMIN") {
      throw new ApiError(403, "NO_ESCALATION", "Vous ne pouvez pas créer d'administrateur.");
    }
    await assertWithinScope(creator, {
      agencyIds: body.agencyIds,
      pointOfSaleIds: body.pointOfSaleIds,
    });
    if (body.agencyIds.length === 0 && body.pointOfSaleIds.length === 0) {
      throw new ApiError(422, "SCOPE_REQUIRED", "Au moins une agence ou un point de vente est requis.", {
        agencyIds: "Sélectionnez au moins une affectation.",
      });
    }
  }

  const created = await auth.api.createUser({
    body: {
      email: body.email,
      password: randomPassword(),
      name: `${body.firstName} ${body.lastName}`.trim(),
      role: role as "user" | "admin",
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        profileId: body.profileId,
        companyId: body.companyId,
        createdById: creator.id,
      },
    },
    headers: h,
  });
  const userId = created.user.id;

  try {
    await prisma.$transaction([
      ...body.agencyIds.map((agencyId) => prisma.agencyMember.create({ data: { userId, agencyId } })),
      ...body.pointOfSaleIds.map((pointOfSaleId) =>
        prisma.pointOfSaleMember.create({ data: { userId, pointOfSaleId } }),
      ),
    ]);
  } catch {
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    throw new ApiError(500, "CREATE_FAILED", "Échec de l'affectation ; création annulée.");
  }

  await auth.api.requestPasswordReset({
    body: { email: body.email, redirectTo: "/nouveau-mot-de-passe" },
  });

  return Response.json({ data: { id: userId, email: created.user.email } }, { status: 201 });
});
