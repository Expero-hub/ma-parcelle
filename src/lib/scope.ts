import { cache } from "react";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api/errors";

export type ScopedUser = { id: string; role?: string | null; profileId: string };

function isAdminOrStaff(user: ScopedUser): boolean {
  const role = user.role ?? "user";
  return role === "admin" || role === "staff";
}

/** Agences dont l'utilisateur est membre direct. ADMIN/STAFF → null (toutes). */
export const getScopedAgencyIds = cache(async (user: ScopedUser): Promise<string[] | null> => {
  if (isAdminOrStaff(user)) return null;
  const members = await prisma.agencyMember.findMany({
    where: { userId: user.id },
    select: { agencyId: true },
  });
  return members.map((m) => m.agencyId);
});

/** PDV membres directs + tous les PDV des agences de l'utilisateur. ADMIN/STAFF → null. */
export const getScopedPointOfSaleIds = cache(async (user: ScopedUser): Promise<string[] | null> => {
  if (isAdminOrStaff(user)) return null;
  const agencyIds = (await getScopedAgencyIds(user)) ?? [];
  const [direct, viaAgency] = await Promise.all([
    prisma.pointOfSaleMember.findMany({ where: { userId: user.id }, select: { pointOfSaleId: true } }),
    agencyIds.length
      ? prisma.pointOfSale.findMany({ where: { agencyId: { in: agencyIds } }, select: { id: true } })
      : Promise.resolve([] as { id: string }[]),
  ]);
  return Array.from(new Set([...direct.map((d) => d.pointOfSaleId), ...viaAgency.map((p) => p.id)]));
});

/** Clause Prisma « users du périmètre ». ADMIN/STAFF → {} (aucun filtre). */
export async function getScopedUserWhere(user: ScopedUser): Promise<Prisma.UserWhereInput> {
  if (isAdminOrStaff(user)) return {};
  const [agencyIds, posIds] = await Promise.all([
    getScopedAgencyIds(user),
    getScopedPointOfSaleIds(user),
  ]);
  return {
    OR: [
      { agencyMembers: { some: { agencyId: { in: agencyIds ?? [] } } } },
      { posMembers: { some: { pointOfSaleId: { in: posIds ?? [] } } } },
      {
        reservations: {
          some: {
            parcelle: {
              OR: [
                { pointOfSale: { agencyId: { in: agencyIds ?? [] } } },
                { pointOfSaleId: { in: posIds ?? [] } },
              ],
            },
          },
        },  
      },
    ],
  };
}

/** Lève 403 si une affectation sort du périmètre (ignoré pour ADMIN/STAFF). */
export async function assertWithinScope(
  user: ScopedUser,
  sel: { agencyIds?: string[]; pointOfSaleIds?: string[] },
): Promise<void> {
  if (isAdminOrStaff(user)) return;
  const [agencyIds, posIds] = await Promise.all([
    getScopedAgencyIds(user),
    getScopedPointOfSaleIds(user),
  ]);
  const allowedA = new Set(agencyIds ?? []);
  const allowedP = new Set(posIds ?? []);
  for (const a of sel.agencyIds ?? []) {
    if (!allowedA.has(a)) throw new ApiError(403, "OUT_OF_SCOPE", "Agence hors de votre périmètre.");
  }
  for (const p of sel.pointOfSaleIds ?? []) {
    if (!allowedP.has(p)) throw new ApiError(403, "OUT_OF_SCOPE", "Point de vente hors de votre périmètre.");
  }
}
