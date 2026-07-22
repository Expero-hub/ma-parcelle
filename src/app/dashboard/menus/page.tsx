import Link from "next/link";
import { ListTree, PlusCircle } from "lucide-react";

import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Button, buttonVariants } from "@/components/ui/button";
import { ModulesTable } from "@/app/dashboard/menus/_components/modules-table";

export default async function ModulesPage() {
  await requirePermission("read");

  const modules = await prisma.module.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      active: true,
      order: true,
      _count: { select: { menus: true } },
    },
  });

  const rows = modules.map((module, index) => ({
    id: module.id,
    label: module.order || index + 1,
    name: module.name,
    active: module.active,
    menusCount: module._count.menus,
  }));

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 border-b border-border pb-6">
        <p className="mb-2 text-sm font-medium text-text-2">Tableau de bord / Modules</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-text">Gestion des modules</h1>
            <p className="mt-2 text-text-2">Liste des modules du dashboard.</p>
          </div>
          <Link href="/dashboard/menus/liste" className={buttonVariants({ variant: "outline", className: "h-10" })}>
            <ListTree className="h-4 w-4" />
            Voir les menus
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <Button disabled className="h-10">
          <PlusCircle className="h-4 w-4" />
          Ajouter un module
        </Button>
      </div>

      <ModulesTable rows={rows} />
    </div>
  );
}
