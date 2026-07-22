import { can, getCurrentUser, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getScopedAgencyIds, type ScopedUser } from "@/lib/scope";
import { CompaniesBoard } from "@/app/dashboard/compagnies/_components/companies-board";

async function getCompanyWhere(user: ScopedUser) {
  return { deletedAt: null };
}

export default async function CompaniesPage() {
  await requirePermission("read");
  const user = (await getCurrentUser())! as ScopedUser;
  const isAdmin = (user.role ?? "user") === "admin";
  const where = await getCompanyWhere(user);

  const [companies, totalCount, canCreate] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { name: "asc" },
      take: 10,
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
    can("/dashboard/compagnies", "create"),
  ]);

  const rows = companies.map((company) => ({
    id: company.id,
    name: company.name,
    address: company.address,
    phone: company.phone,
    active: company.active,
    agenciesCount: 0,
    usersCount: company._count.users,
  }));

  return <CompaniesBoard initialRows={rows} initialTotalCount={totalCount} canCreate={isAdmin && canCreate} />;
}
