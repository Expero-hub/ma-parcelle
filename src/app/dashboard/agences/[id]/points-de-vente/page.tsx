import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireUser, requirePermission, can } from "@/lib/authz";
import { assertWithinScope } from "@/lib/scope";
import { ApiError } from "@/lib/api/errors";
import { PointsOfSaleList } from "./points-of-sale-list";

const POINTS_DE_VENTE_MENU_URL = "/dashboard/agences/[id]/points-de-vente";

export default async function AgencyPointsOfSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Vérifie le droit de lecture sur ce menu précis (segment [id] géré par authz.ts).
  await requirePermission("read");

  const user = await requireUser();
  const { id: agencyId } = await params;

  try {
    await assertWithinScope(user, { agencyIds: [agencyId] });
  } catch (error) {
    if (error instanceof ApiError) notFound();
    throw error;
  }

  const [agency, pointsOfSale, totalCount, canCreate, agencyMembers] = await Promise.all([
    prisma.agency.findFirst({
      where: { id: agencyId, deletedAt: null },
      select: { id: true, name: true },
    }),
    prisma.pointOfSale.findMany({
      where: { agencyId },
      orderBy: { name: "asc" },
      take: 10,
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
    prisma.pointOfSale.count({
      where: { agencyId },
    }),
    can(POINTS_DE_VENTE_MENU_URL, "create"),
    prisma.agencyMember.findMany({
      where: { agencyId },
      select: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
  ]);

  if (!agency) notFound();

  // Formater les membres de l'agence pour le sélecteur combobox
  const agencyUsers = agencyMembers
    .filter((m) => m.user !== null)
    .map((m) => ({
      id: m.user.id,
      name: `${m.user.firstName || ""} ${m.user.lastName || ""}`.trim() + ` (${m.user.email})`,
    }));

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="mb-2 text-sm font-medium text-text-2">
            Tableau de bord / Agences / {agency.name}
          </p>
          <h1 className="font-display text-3xl font-semibold text-text">Points de vente</h1>
          <p className="mt-2 text-text-2">Points de vente rattachés à l&apos;agence {agency.name}.</p>
        </div>
        <Link
          href="/dashboard/agences"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux agences
        </Link>
      </div>

      <PointsOfSaleList
        agencyId={agency.id}
        initialPointsOfSale={pointsOfSale}
        initialTotalCount={totalCount}
        canCreate={canCreate}
        agencyUsers={agencyUsers}
      />
    </div>
  );
}
