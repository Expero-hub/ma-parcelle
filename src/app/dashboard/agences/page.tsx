import { can, getCurrentUser, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getScopedAgencyIds, type ScopedUser } from "@/lib/scope";
import { AgenciesBoard } from "@/app/dashboard/agences/_components/agencies-board";

async function getAgencyWhere(user: ScopedUser) {
  const role = user.role ?? "user";
  if (role === "admin" || role === "staff") return { deletedAt: null };
  const agencyIds = (await getScopedAgencyIds(user)) ?? [];
  return { deletedAt: null, id: { in: agencyIds } };
}

export default async function AgenciesPage() {
  await requirePermission("read");
  const user = (await getCurrentUser())! as ScopedUser;
  const where = await getAgencyWhere(user);

  const [agencies, totalCount, canCreate] = await Promise.all([
    prisma.agency.findMany({
      where,
      orderBy: { name: "asc" },
      take: 10,
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
    can("/dashboard/agences", "create"),
  ]);

  const rows = agencies.map((agency) => ({
    id: agency.id,
    name: agency.name,
    address: agency.address,
    phone: agency.phone,
    active: agency.active,
    pointsOfSaleCount: agency._count.pointsOfSale,
    membersCount: agency._count.members,
  }));

  return (
    <AgenciesBoard
      initialRows={rows}
      initialTotalCount={totalCount}
      canCreate={canCreate}
    />
  );
}
