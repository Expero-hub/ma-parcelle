import { notFound } from "next/navigation";

import { requirePermission, getCurrentUser } from "@/lib/authz";
import { getScopedPointOfSaleIds, type ScopedUser } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { AddParcelleForm } from "../../_components/add-parcelle-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditParcellePage({ params }: PageProps) {
  await requirePermission("update");
  const { id } = await params;

  const user = (await getCurrentUser())! as ScopedUser;
  const scopedPosIds = await getScopedPointOfSaleIds(user);

  const [parcelle, pointsOfSale, zones] = await Promise.all([
    prisma.parcelle.findFirst({
      where: { id, deletedAt: null },
      include: { images: { orderBy: { order: "asc" } } },
    }),
    prisma.pointOfSale.findMany({
      where: {
        active: true,
        ...(scopedPosIds === null ? {} : { id: { in: scopedPosIds } }),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.zone.findMany({
      where: { active: true, deletedAt: null },
      select: { id: true, code: true, commune: true, department: true },
      orderBy: { code: "asc" },
    }),
  ]);

  if (!parcelle) notFound();

  // Scope check
  if (scopedPosIds !== null && (!parcelle.pointOfSaleId || !scopedPosIds.includes(parcelle.pointOfSaleId))) {
    return notFound(); // standard fallback for unauthorized items
  }

  const formattedParcelle = {
    id: parcelle.id,
    reference: parcelle.reference,
    area: Number(parcelle.area),
    price: Number(parcelle.price),
    minDuration: parcelle.minDuration ?? 0,
    maxDuration: parcelle.maxDuration ?? 0,
    pointOfSaleId: parcelle.pointOfSaleId ?? "",
    zoneId: parcelle.zoneId,
    description: parcelle.description ?? "",
    geom: parcelle.geom,
    status: parcelle.status,
    images: parcelle.images.map((img) => ({
      id: img.id,
      path: img.path,
    })),
  };

  const formattedZones = zones.map((z) => ({
    id: z.id,
    code: z.code,
    commune: z.commune ?? "",
    department: z.department ?? "",
  }));

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-text">Modifier la parcelle</h1>
        <p className="text-sm text-text-2 mt-1">
          Ajustez les informations de la parcelle et ses limites géographiques
        </p>
      </div>
      <AddParcelleForm
        pointsOfSale={pointsOfSale}
        zones={formattedZones}
        initialData={formattedParcelle}
      />
    </div>
  );
}
