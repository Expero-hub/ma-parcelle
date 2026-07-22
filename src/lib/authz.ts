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
      return perms
        .filter((p) => Boolean(p.menu))
        .map((p) => ({
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

// ---------------------------------------------------------------------------
// Matching d'URL avec support des segments dynamiques ("[id]", "[slug]", ...)
//
// Un Menu.url peut désormais contenir des segments entre crochets, exactement
// comme les dossiers de route Next.js (ex: "/dashboard/agences/[id]/points-de-vente").
// Un tel segment matche n'importe quel segment réel du chemin visité.
// ---------------------------------------------------------------------------

const DYNAMIC_SEGMENT = /^\[.+\]$/;

function toSegments(url: string): string[] {
  return url.split("/").filter(Boolean);
}

function segmentMatches(patternSegment: string, pathSegment: string | undefined): boolean {
  if (pathSegment === undefined) return false;
  return DYNAMIC_SEGMENT.test(patternSegment) || patternSegment === pathSegment;
}

/**
 * Vrai si `pathname` correspond exactement à `menuUrl`, ou est une sous-route
 * de celui-ci (comportement de préfixe conservé, désormais calculé segment
 * par segment pour pouvoir ignorer les segments dynamiques du menu).
 */
function urlMatchesPath(menuUrl: string, pathname: string): boolean {
  const patternSegments = toSegments(menuUrl);
  const pathSegments = toSegments(pathname);
  if (patternSegments.length > pathSegments.length) return false;
  return patternSegments.every((segment, index) => segmentMatches(segment, pathSegments[index]));
}

/**
 * Menu dont l'url est le match le plus spécifique (le plus de segments)
 * pour le chemin donné. Un menu à segments dynamiques ("[id]") peut donc
 * être plus spécifique qu'un menu parent, même si sa chaîne brute est
 * plus courte que ce que donnerait une simple comparaison de longueur.
 */
function matchMenu(menus: AllowedMenu[], pathname: string): AllowedMenu | undefined {
  return menus
    .filter((m) => m.url && urlMatchesPath(m.url, pathname))
    .sort((a, b) => toSegments(b.url!).length - toSegments(a.url!).length)[0];
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

  // On exclut les menus racines ("/dashboard", "/mon-espace") du calcul de préfixe :
  // leur url étant un préfixe de TOUTES les sous-routes, les inclure permettrait
  // qu'un droit sur "Tableau de bord" ouvre l'accès à tout le dashboard.
  const menus = (await getUserMenus()).filter(
    (m) => m.url !== "/dashboard" && m.url !== "/mon-espace",
  );
  const menu = matchMenu(menus, pathname);
  if (!menu || !menu.can[action]) forbidden();
  return user;
}

/**
 * ADMIN → true. Sinon vérifie le droit `action` du profil sur le menu exact `menuUrl`.
 * `menuUrl` doit être l'URL TELLE QU'ENREGISTRÉE dans Menu.url (avec ses éventuels
 * segments "[id]" littéraux) — pas le chemin résolu du navigateur.
 * Sert aux gardes d'API et à l'affichage conditionnel côté UI.
 */
export async function can(
  menuUrl: string,
  action: "read" | "create" | "update" | "delete",
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  if ((user.role ?? "user") === "admin") return true;
  const menus = await getUserMenus();
  const menu = menus.find((m) => m.url === menuUrl);
  return menu ? menu.can[action] : false;
}
