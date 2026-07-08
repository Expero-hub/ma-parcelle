# Lot 3.1 — Autorisation & protection des routes

**Date :** 2026-07-08
**Statut :** Design (en attente de relecture utilisateur avant plan)
**Projet :** `ma_parcelle` — Next.js 16 (App Router)
**Dépend de :** Lot 1 (schéma RBAC : Profile, Module, Menu hiérarchique, ProfilePermission) + Lot 2 (Better Auth, session, rôles `admin`/`staff`/`user`).

---

## 1. Objectif & périmètre

Poser la **couche d'autorisation** de l'application : protéger les routes du dashboard et de
l'espace client, charger les permissions d'un profil depuis la DB (avec cache), et **bloquer un
STAFF** hors de ses modules — **même s'il tape l'URL** — via une page **403** élégante. Inclut des
durcissements sécurité de base. C'est la fondation des lots 3.2 (dashboard admin), 3.3 (gestion
utilisateurs) et 3.4 (espace client).

### Hors périmètre (→ lots suivants)

- Le **scoping des données** (filtrer quels enregistrements un STAFF voit selon ses agences/points
  de vente) → **Lot 3.3**, avec la 1re liste scopée.
- La sidebar collapsible et le layout visuel du dashboard → **Lot 3.2** (ce lot expose seulement
  `getUserMenus`, que la sidebar consommera).
- Les écrans d'administration des profils/menus (qui déclencheront l'invalidation du cache).

---

## 2. Décisions (validées)

1. **`proxy.ts`** (ex-`middleware.ts`, renommé en Next.js 16) = protection **grossière optimiste** : présence du cookie de session → sinon redirection `/connexion`. **Aucune requête DB** dans le proxy.
2. **Autorisation réelle côté serveur** (Server Components / Route Handlers), conformément au guide *Data Security* de Next.js 16 (« vérifier l'auth dans chaque server function, ne pas se reposer sur le proxy »).
3. **403 « Accès refusé »** : page/composant élégant (design system). Le contenu protégé n'est jamais rendu.
4. **Cache des permissions** dès maintenant : `unstable_cache` (clé par `profileId`, tags `permissions:<profileId>` / `menus:all`, TTL 300 s) + React `cache()` (dédup intra-requête). Invalidation par tag documentée.
5. **Scoping des données** différé au Lot 3.3 (YAGNI).
6. **Durcissements sécurité** inclus : échappement HTML du template email, vérification d'origine sur les routes mutantes, en-têtes de sécurité.

---

## 3. Architecture — défense en profondeur

```
Requête
  │
  ▼
proxy.ts  (Node runtime)         ← grossier : cookie de session présent ? sinon → /connexion
  │  (injecte x-pathname)
  ▼
Server Components / Layouts / Route Handlers   ← FIN : rôle + permission par menu (DB + cache)
  ├── dashboard/layout.tsx : requireRole(['admin','staff'])   (zone)
  ├── chaque page          : requirePermission(pathname)       (menu)  → 403 si refus
  └── /api/*               : requireUser/requireRole + zod + origine
  │
  ▼
Prisma → Supabase
```

Trois barrières : **proxy** (optimiste, UX), **layout de zone** (rôle), **page** (permission fine).
La sécurité ne repose jamais sur le proxy seul.

---

## 4. `src/proxy.ts`

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  const hasSession = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  if (!hasSession) {
    const url = new URL("/connexion", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Transmettre le chemin courant aux Server Components (pour requirePermission).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/dashboard/:path*", "/mon-espace/:path*"],
};
```

> **Note Next.js 16** : le proxy tourne sur le runtime Node.js. On reste volontairement minimal
> (présence du cookie). Vérifier au moment du plan que `getSessionCookie` est bien exporté par
> `better-auth/cookies` (sinon lire le cookie par son nom).

---

## 5. `src/lib/authz.ts` — utils d'autorisation serveur

```ts
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
export async function requireRole(roles: Array<"admin" | "staff" | "user">) {
  const user = await requireUser();
  if (!roles.includes(user.role as "admin" | "staff" | "user")) {
    redirect(user.role === "user" ? "/mon-espace" : "/dashboard");
  }
  return user;
}
```

### Chargement des menus autorisés (avec cache)

```ts
export type AllowedMenu = {
  id: string;
  name: string;
  url: string | null;
  icon: string | null;
  parentId: string | null;
  can: { create: boolean; read: boolean; update: boolean; delete: boolean };
};

/** Menus d'un profil STAFF (canRead=true), cachés par profil + tag d'invalidation. */
const getStaffMenus = (profileId: string) =>
  unstable_cache(
    async () => {
      const perms = await prisma.profilePermission.findMany({
        where: { profileId, canRead: true, menu: { active: true } },
        include: { menu: true },
      });
      return perms.map((p): AllowedMenu => ({
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
  if (user.role === "admin") return getAllMenus();
  return getStaffMenus(user.profileId);
});
```

### `requirePermission` — la barrière fine

```ts
import { forbidden } from "next/navigation"; // Next 16 ; nécessite experimental.authInterrupts

/** Trouve le menu dont l'url est le plus long préfixe du chemin. */
function matchMenu(menus: AllowedMenu[], pathname: string): AllowedMenu | undefined {
  return menus
    .filter((m) => m.url && (pathname === m.url || pathname.startsWith(m.url + "/")))
    .sort((a, b) => (b.url!.length - a.url!.length))[0];
}

/**
 * Vérifie que l'utilisateur a le droit `action` sur la route `pathname`.
 * ADMIN passe toujours ; racine /dashboard toujours autorisée ; sinon 403.
 */
export async function requirePermission(action: "read" | "create" | "update" | "delete" = "read") {
  const user = await requireUser();
  if (user.role === "admin") return user;

  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname === "/dashboard" || pathname === "/mon-espace") return user;

  const menus = await getUserMenus();
  const menu = matchMenu(menus, pathname);
  if (!menu || !menu.can[action]) forbidden();
  return user;
}
```

> **Mécanisme 403** : `forbidden()` (Next.js 16, requiert `experimental.authInterrupts: true` dans
> `next.config.ts`) rend le fichier `forbidden.tsx` le plus proche. **À confirmer stable sur Next
> 16.2 au moment du plan** ; fallback : `requirePermission` renvoie un booléen et la page rend
> `<Forbidden />`. Le composant `<Forbidden />` reste utilisé dans les deux cas.

---

## 6. Application des guards & 403

- **`src/app/dashboard/layout.tsx`** (nouveau) : `await requireRole(["admin", "staff"])`. Un CLIENT est redirigé vers `/mon-espace`. (Gate de zone : basé sur le rôle → fiable en layout.)
- **Chaque page `/dashboard/*`** appelle `await requirePermission()` en tête. Fiable car les pages (Server Components) se re-rendent à chaque navigation → la vérif suit toujours le chemin réel, **même en tapant l'URL**.
- **`src/app/forbidden.tsx`** (ou `<Forbidden />` dans `src/components/shared/`) : page 403 élégante (logo, message « Vous n'avez pas accès à cette section », bouton retour vers `/dashboard`).
- Migration des stubs `/dashboard/page.tsx` et `/mon-espace/page.tsx` vers ces utils.

---

## 7. Durcissements sécurité

1. **Échappement HTML** dans `src/lib/email/templates.ts` : `escapeHtml(name)` avant interpolation (évite l'injection HTML via le nom d'un compte créé par un admin).
2. **Vérification d'origine** sur les routes mutantes : helper `assertSameOrigin(req)` (compare `Origin`/`Referer` à l'hôte) appliqué à `POST /api/users`. Défense CSRF en complément des cookies `SameSite` de Better Auth.
3. **En-têtes de sécurité** dans `next.config.ts` (`headers()`) : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. (CSP notée pour un lot ultérieur — complexe avec Next.)

---

## 8. Comment un STAFF est bloqué (à documenter dans le README)

1. **Proxy** : sans cookie de session → redirigé vers `/connexion`. Empêche l'accès anonyme.
2. **Layout dashboard** : un CLIENT (role `user`) est renvoyé vers `/mon-espace`. Seuls `admin`/`staff` entrent dans `/dashboard`.
3. **Page** : `requirePermission()` lit le chemin (`x-pathname`), charge les menus autorisés du profil (`ProfilePermission.canRead`), et si le chemin ne correspond à **aucun** menu autorisé → **403**. Un STAFF qui tape `/dashboard/utilisateurs` sans la permission ne verra jamais le contenu.
4. **Menu latéral** (Lot 3.2) : ne liste que les menus autorisés → l'utilisateur ne voit pas les liens interdits. Mais la sécurité ne dépend pas de l'UI : la barrière serveur (point 3) bloque même l'accès direct par URL.
5. **API** (Lot 3.3+) : chaque endpoint mutant revérifie rôle + permission + origine.

> Principe : **le menu masqué n'est pas une sécurité** ; la sécurité est la revalidation serveur à chaque requête. On documente les deux.

---

## 9. Cache & invalidation (contrat)

- Lecture cachée par `unstable_cache` (tags `permissions:<profileId>`, `menus:all`, TTL 300 s) + `cache()` React (intra-requête).
- **Contrat d'invalidation** (implémenté par les écrans des lots suivants) :
  - après modification des permissions d'un profil → `revalidateTag('permissions:'+profileId)` ;
  - après création/modification/désactivation de modules ou menus → `revalidateTag('menus:all')`.
- Sans invalidation, un changement de droit met jusqu'à 300 s à s'appliquer (filet TTL). Le contrat garantit l'effet immédiat.

---

## 10. Fichiers

**Créés :** `src/proxy.ts`, `src/lib/authz.ts`, `src/app/forbidden.tsx` (+ éventuellement `src/components/shared/forbidden.tsx`), `src/app/dashboard/layout.tsx`, `src/lib/api/origin.ts` (assertSameOrigin).
**Modifiés :** `src/app/dashboard/page.tsx`, `src/app/mon-espace/page.tsx` (utils authz), `src/lib/email/templates.ts` (échappement), `src/app/api/users/route.ts` (origine), `next.config.ts` (headers + `experimental.authInterrupts` si `forbidden()`).

---

## 11. Vérification & critères de succès

**Offline (sans credentials) :**
1. `npx tsc --noEmit` sans erreur.
2. `npm run build` réussit ; `proxy.ts` détecté ; routes protégées présentes.
3. Revue : proxy ne fait aucune requête DB ; toute page dashboard appelle `requirePermission` ; email échappé ; origine vérifiée sur `/api/users`.

**Avec credentials (après T16) :**
4. Un CLIENT sur `/dashboard/*` → redirigé `/mon-espace`.
5. Un STAFF sans permission sur `/dashboard/utilisateurs` (URL directe) → **403**.
6. Un STAFF avec la permission → accède ; un ADMIN → accède partout.
7. Après `revalidateTag`, un changement de permission s'applique immédiatement.

---

## 12. README (à enrichir en fin de Lot 3)

Documenter : les 3 types de profil (ADMIN/CLIENT/STAFF), le modèle de permissions (Module → Menu →
ProfilePermission CRUD), **comment le blocage de route fonctionne** (les 5 barrières ci-dessus),
la validation zod (client + serveur) et l'enveloppe d'erreur, le cache et son invalidation, et les
durcissements sécurité (SQL via Prisma paramétré, échappement, origine, en-têtes).
