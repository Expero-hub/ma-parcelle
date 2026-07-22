import Link from "next/link";

import { requirePermission, can, getCurrentUser } from "@/lib/authz";
import { getScopedUserWhere, type ScopedUser } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { ClientsTable } from "./_components/clients-table";

export default async function ClientsPage() {
  await requirePermission("read");
  const user = (await getCurrentUser())!;
  const where = await getScopedUserWhere(user as ScopedUser);

  const [users, totalCount, canCreate] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...where,
        deletedAt: null,
        profile: { type: "CLIENT" },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        banned: true,
        company: { select: { name: true } },
      },
    }),
    prisma.user.count({
      where: {
        ...where,
        deletedAt: null,
        profile: { type: "CLIENT" },
      },
    }),
    can("/dashboard/utilisateurs", "create"),
  ]);

  const rows = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    companyName: u.company?.name ?? "—",
    active: u.active && !u.banned,
  }));

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-text-2">Tableau de bord / Clients</p>
          <h1 className="font-display text-2xl font-semibold text-text">Clients</h1>
        </div>
        {canCreate && (
          <Link
            href="/dashboard/utilisateurs/nouveau"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
          >
            Ajouter un client
          </Link>
        )}
      </div>
      <ClientsTable rows={rows} initialTotalCount={totalCount} />
    </div>
  );
}
