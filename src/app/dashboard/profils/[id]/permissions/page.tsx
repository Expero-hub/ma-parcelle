import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PermissionsTable } from "../../_components/permissions-table";

export default async function ProfilePermissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("read");
  const { id } = await params;

  const [profile, menus, totalCount] = await Promise.all([
    prisma.profile.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true, type: true },
    }),
    prisma.menu.findMany({
      where: { active: true },
      orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
      take: 10,
      select: {
        id: true,
        name: true,
        url: true,
        parent: { select: { name: true } },
        module: { select: { name: true } },
        permissions: {
          where: { profileId: id },
          select: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
          take: 1,
        },
      },
    }),
    prisma.menu.count({
      where: { active: true },
    }),
  ]);

  if (!profile) notFound();

  const isAdminProfile = profile.type === "ADMIN";

  const rows = menus.map((menu) => {
    const permission = menu.permissions[0];
    const granted =
      isAdminProfile ||
      Boolean(
        permission?.canCreate && permission?.canRead && permission?.canUpdate && permission?.canDelete
      );

    return {
      id: menu.id,
      name: menu.name,
      module: menu.module.name,
      parent: menu.parent?.name ?? "-",
      url: menu.url ?? "-",
      granted,
    };
  });

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="mb-2 text-sm font-medium text-text-2">Tableau de bord / Permissions</p>
          <h1 className="font-display text-3xl font-semibold text-text">Permissions</h1>
          <p className="mt-2 text-text-2">Liste des privileges accordes au profil {profile.name}.</p>
        </div>
        <Link
          href="/dashboard/profils"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
      </div>

      <PermissionsTable
        profileId={profile.id}
        profileName={profile.name}
        isAdminProfile={isAdminProfile}
        rows={rows}
        initialTotalCount={totalCount}
      />
    </div>
  );
}
