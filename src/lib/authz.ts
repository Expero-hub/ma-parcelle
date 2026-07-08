import { cache } from "react";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { redirect, forbidden } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Role = "admin" | "staff" | "user";

/** Session courante (null si non connecté). Dédupliquée par requête. */
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
});

/** Exige une session, sinon redirige vers la connexion. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}

/** Exige un des rôles donnés (sinon redirection contextuelle). */
export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  const role = (user.role ?? "user") as Role;
  if (!roles.includes(role)) {
    redirect(role === "user" ? "/mon-espace" : "/dashboard");
  }
  return user;
}

export type AllowedMenu = {
  id: string;
  name: string;
  url: string | null;
  icon: string | null;
  parentId: string | null;
  can: { create: boolean; read: boolean; update: boolean; delete: boolean };
};

/** Menus d'un profil STAFF (canRead=true), cachés par profil + tag d'invalidation. */
function getStaffMenus(profileId: string) {
  return unstable_cache(
    async (): Promise<AllowedMenu[]> => {
      const perms = await prisma.profilePermission.findMany({
        where: { profileId, canRead: true, menu: { active: true } },
        include: { menu: true },
      });
      return perms.map((p) => ({
        id: p.menu.id,
        name: p.menu.name,
        url: p.menu.url,
        icon: p.menu.icon,
        parentId: p.menu.parentId,
        can: { create: p.canCreate, read: p.canRead, update: p.canUpdate, delete: p.canDelete },
      }));
    },
    ["staff-menus", profileId],
    { tags: [`permissions:${profileId}`], revalidate: 300 },
  )();
}

/** Tous les menus actifs (ADMIN), cachés avec tag global. */
const getAllMenus = unstable_cache(
  async (): Promise<AllowedMenu[]> => {
    const menus = await prisma.menu.findMany({ where: { active: true } });
    return menus.map((m) => ({
      id: m.id,
      name: m.name,
      url: m.url,
      icon: m.icon,
      parentId: m.parentId,
      can: { create: true, read: true, update: true, delete: true },
    }));
  },
  ["all-menus"],
  { tags: ["menus:all"], revalidate: 300 },
);

/** Menus accessibles à l'utilisateur courant (dédup intra-requête). */
export const getUserMenus = cache(async (): Promise<AllowedMenu[]> => {
  const user = await requireUser();
  if ((user.role ?? "user") === "admin") return getAllMenus();
  return getStaffMenus(user.profileId);
});

/** Menu dont l'url est le plus long préfixe du chemin. */
function matchMenu(menus: AllowedMenu[], pathname: string): AllowedMenu | undefined {
  return menus
    .filter((m) => m.url && (pathname === m.url || pathname.startsWith(m.url + "/")))
    .sort((a, b) => b.url!.length - a.url!.length)[0];
}

/**
 * Vérifie le droit `action` sur la route courante (x-pathname).
 * ADMIN passe toujours ; racines /dashboard et /mon-espace toujours autorisées ; sinon 403.
 */
export async function requirePermission(
  action: "read" | "create" | "update" | "delete" = "read",
) {
  const user = await requireUser();
  if ((user.role ?? "user") === "admin") return user;

  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname === "/dashboard" || pathname === "/mon-espace") return user;

  const menus = await getUserMenus();
  const menu = matchMenu(menus, pathname);
  if (!menu || !menu.can[action]) forbidden();
  return user;
}
