import { requirePermission, getCurrentUser } from "@/lib/authz";
import { getScopedPointOfSaleIds, type ScopedUser } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { AddParcelleForm } from "../_components/add-parcelle-form";

export default async function AddParcellePage() {
  await requirePermission("create");

  const user = (await getCurrentUser())! as ScopedUser;
  const scopedPosIds = await getScopedPointOfSaleIds(user);

  const [pointsOfSale, zones] = await Promise.all([
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

  const formattedZones = zones.map((z) => ({
    id: z.id,
    code: z.code,
    commune: z.commune ?? "",
    department: z.department ?? "",
  }));

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-text">Enregistrer une nouvelle parcelle</h1>
        <p className="text-sm text-text-2 mt-1">
          Remplissez les informations de la parcelle et définissez ses limites géographiques
        </p>
      </div>
      <AddParcelleForm pointsOfSale={pointsOfSale} zones={formattedZones} />
    </div>
  );
}
