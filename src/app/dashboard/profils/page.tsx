import { can, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { ProfilesTable } from "@/app/dashboard/profils/_components/profiles-table";

export default async function ProfilesPage() {
  await requirePermission("read");

  const [profiles, canCreate, canUpdate, canDelete] = await Promise.all([
    prisma.profile.findMany({
      where: { deletedAt: null },
      orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        active: true,
        isSystem: true,
        _count: { select: { users: true, permissions: true } },
      },
    }),
    can("/dashboard/profils", "create"),
    can("/dashboard/profils", "update"),
    can("/dashboard/profils", "delete"),
  ]);

  const rows = profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    type: profile.type,
    description: profile.description,
    active: profile.active,
    isSystem: profile.isSystem,
    usersCount: profile._count.users,
    permissionsCount: profile._count.permissions,
  }));

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 border-b border-border pb-6">
        <p className="mb-2 text-sm font-medium text-text-2">Tableau de bord / Profils</p>
        <h1 className="font-display text-3xl font-semibold text-text">Gestion des profils utilisateurs</h1>
        <p className="mt-2 text-text-2">Liste des profils utilisateurs et de leurs permissions.</p>
      </div>
      <ProfilesTable rows={rows} canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} />
    </div>
  );
}
