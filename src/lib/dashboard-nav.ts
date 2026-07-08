import { cache } from "react";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

export type MenuNode = {
  id: string;
  name: string;
  url: string | null;
  icon: string | null;
  children: MenuNode[];
};
export type SidebarModule = { id: string; name: string; items: MenuNode[] };

/** Modules actifs + leurs menus actifs (cachés, tag menus:all). */
const fetchModules = unstable_cache(
  async () =>
    prisma.module.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: { menus: { where: { active: true }, orderBy: { order: "asc" } } },
    }),
  ["sidebar-modules"],
  { tags: ["menus:all"], revalidate: 300 },
);

/** Ids de menus lisibles par un profil STAFF (cachés, tag permissions:<profileId>). */
function fetchPermittedMenuIds(profileId: string) {
  return unstable_cache(
    async () => {
      const perms = await prisma.profilePermission.findMany({
        where: { profileId, canRead: true },
        select: { menuId: true },
      });
      return perms.map((p) => p.menuId);
    },
    ["sidebar-perms", profileId],
    { tags: [`permissions:${profileId}`], revalidate: 300 },
  )();
}

/** Arbre de navigation de l'utilisateur courant (dédup intra-requête). */
export const getSidebarTree = cache(async (): Promise<SidebarModule[]> => {
  const user = await requireUser();
  const modules = await fetchModules();
  const permitted =
    user.role === "admin" ? null : new Set(await fetchPermittedMenuIds(user.profileId));

  const result: SidebarModule[] = [];
  for (const mod of modules) {
    const visible = mod.menus.filter((m) => permitted === null || permitted.has(m.id));
    if (visible.length === 0) continue;

    const byId = new Map<string, MenuNode>(
      visible.map((m) => [m.id, { id: m.id, name: m.name, url: m.url, icon: m.icon, children: [] }]),
    );
    const roots: MenuNode[] = [];
    for (const m of visible) {
      const node = byId.get(m.id)!;
      // Un enfant dont le parent n'est pas visible remonte à la racine du module.
      if (m.parentId && byId.has(m.parentId)) byId.get(m.parentId)!.children.push(node);
      else roots.push(node);
    }
    result.push({ id: mod.id, name: mod.name, items: roots });
  }
  return result;
});
