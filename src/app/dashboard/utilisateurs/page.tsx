import Link from "next/link";

import { requirePermission, can, getCurrentUser } from "@/lib/authz";
import { getScopedUserWhere, type ScopedUser } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { UsersTable } from "@/app/dashboard/utilisateurs/_components/users-table";

export default async function UsersPage() {
  await requirePermission("read");
  const user = (await getCurrentUser())!;
  const where = await getScopedUserWhere(user as ScopedUser);

  const [users, canCreate] = await Promise.all([
    prisma.user.findMany({
      where: { ...where, deletedAt: null },
      orderBy: { createdAt: "desc" },
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
    can("/dashboard/utilisateurs", "create"),
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

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-text">Utilisateurs</h1>
        {canCreate && (
          <Link
            href="/dashboard/utilisateurs/nouveau"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
          >
            Créer un utilisateur
          </Link>
        )}
      </div>
      <UsersTable rows={rows} />
    </div>
  );
}
