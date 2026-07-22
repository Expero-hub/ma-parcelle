import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { MenusTable } from "@/app/dashboard/menus/_components/menus-table";

export default async function MenusPage() {
  await requirePermission("read");

  const [menus, modules] = await Promise.all([
    prisma.menu.findMany({
      orderBy: [{ module: { order: "asc" } }, { parentId: "asc" }, { order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        icon: true,
        url: true,
        active: true,
        order: true,
        moduleId: true,
        parentId: true,
        parent: { select: { name: true, moduleId: true } },
        module: { select: { name: true } },
      },
    }),
    prisma.module.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows = menus.map((menu, index) => ({
    id: menu.id,
    label: menu.order || index + 1,
    name: menu.name,
    icon: menu.icon,
    url: menu.url,
    moduleId: menu.moduleId,
    module: menu.module.name,
    parentId: menu.parentId,
    parent: menu.parent?.name ?? null,
    order: menu.order,
    active: menu.active,
  }));

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 border-b border-border pb-6">
        <p className="mb-2 text-sm font-medium text-text-2">Tableau de bord / Menus</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-text">Gestion des menus</h1>
            <p className="mt-2 text-text-2">Liste des menus et sous-menus du dashboard.</p>
          </div>
          <Link href="/dashboard/menus" className={buttonVariants({ variant: "outline", className: "h-10" })}>
            <ArrowLeft className="h-4 w-4" />
            Retour modules
          </Link>
        </div>
      </div>

      <MenusTable rows={rows} modules={modules} />
    </div>
  );
}
