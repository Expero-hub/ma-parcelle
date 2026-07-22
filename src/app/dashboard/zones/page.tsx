import { ZonesBoard } from "@/app/dashboard/zones/_components/zones-board";
import { can, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function ZonesPage() {
  await requirePermission("read");
  const canCreate = await can("/dashboard/zones", "create");

  const [zones, totalCount] = await Promise.all([
    prisma.zone.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        code: true,
        fullAddress: true,
        department: true,
        commune: true,
        district: true,
        latitude: true,
        longitude: true,
        active: true,
      },
    }),
    prisma.zone.count({ where: { deletedAt: null } }),
  ]);

  const rows = zones.map((zone) => ({
    id: zone.id,
    code: zone.code,
    fullAddress: zone.fullAddress,
    department: zone.department,
    commune: zone.commune,
    district: zone.district,
    latitude: zone.latitude?.toString() ?? "",
    longitude: zone.longitude?.toString() ?? "",
    active: zone.active,
  }));

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 border-b border-border pb-6">
        <p className="mb-2 text-sm font-medium text-text-2">
          Tableau de bord / Zones
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-text">
              Gestion des zones
            </h1>
            <p className="mt-2 text-text-2">
              Liste des zones.
            </p>
          </div>
        </div>
      </div>

      <ZonesBoard
        initialRows={rows}
        initialTotalCount={totalCount}
        canCreate={canCreate}
      />
    </div>
  );
}
