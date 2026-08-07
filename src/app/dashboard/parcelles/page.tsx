import { requirePermission, can, getCurrentUser } from "@/lib/authz";
import { getScopedPointOfSaleIds, type ScopedUser } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { ParcellesList } from "./_components/parcelles-list";

export default async function ParcellesPage() {
  await requirePermission("read");

  const user = (await getCurrentUser())! as ScopedUser;
  const scopedPosIds = await getScopedPointOfSaleIds(user);

  const where: any = {
    deletedAt: null,
    ...(scopedPosIds === null ? {} : { pointOfSaleId: { in: scopedPosIds } }),
  };

  const [parcelles, totalCount, pointsOfSale, canCreate] = await Promise.all([
    prisma.parcelle.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10,
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
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            totalAmount: true,
            installments: {
              where: { deletedAt: null },
              select: {
                payments: {
                  where: { deletedAt: null },
                  select: { amount: true },
                },
              },
            },
          },
        },
        reservations: {
          where: { status: "PENDING", deletedAt: null },
          select: { id: true },
        },
      },
    }),
    prisma.parcelle.count({ where }),
    prisma.pointOfSale.findMany({
      where: {
        active: true,
        ...(scopedPosIds === null ? {} : { id: { in: scopedPosIds } }),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    can("/dashboard/parcelles", "create"),
  ]);

  const rows = parcelles.map((p) => {
    let recoveryRate = 0;
    const activeContract = p.contracts[0];
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
      interestedCount: p.reservations.length,
    };
  });

  return (
    <div className="p-6 md:p-8">
      <ParcellesList
        initialRows={rows}
        initialTotalCount={totalCount}
        pointsOfSale={pointsOfSale}
        canCreate={canCreate}
      />
    </div>
  );
}
