# Lot 3.1 — Autorisation & protection des routes : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protéger les routes du dashboard/espace client et bloquer un STAFF hors de ses modules (même par URL directe), via un `proxy.ts` optimiste + une couche d'autorisation serveur avec cache, une page 403 élégante, et des durcissements sécurité.

**Architecture:** Défense en profondeur — `proxy.ts` (Node runtime, présence du cookie de session, injecte `x-pathname`) → layout de zone (`requireRole`) → page (`requirePermission` par menu, avec permissions chargées de la DB et cachées). 403 via `forbidden()` (Next 16, `authInterrupts`).

**Tech Stack:** Next.js 16 (proxy.ts, forbidden/authInterrupts, unstable_cache), Better Auth 1.6 (`getSessionCookie`), Prisma 7, React `cache()`.

**Référence spec :** `docs/superpowers/specs/2026-07-08-lot3-1-autorisation-routes-design.md`

**Vérification :** pas de framework de test (cohérent Lots 1-2). Portes : `npx tsc --noEmit` + `npm run build`. Le blocage réel end-to-end nécessite la DB (credentials, après T16).

**Convention de commit :** `git add <chemins précis>` uniquement — WIP non lié présent. Jamais `git add -A`/`.`.

**AGENTS.md :** les APIs Next.js ci-dessous sont issues de la doc embarquée (`node_modules/next/dist/docs/`, fichiers `proxy.md`, `forbidden.md`, `authInterrupts.md`) déjà consultée. Re-vérifier si un doute.

---

## File Structure

**Créés :** `src/proxy.ts`, `src/lib/authz.ts`, `src/app/forbidden.tsx`, `src/app/dashboard/layout.tsx`, `src/lib/api/origin.ts`
**Modifiés :** `next.config.ts` (authInterrupts + headers), `src/app/dashboard/page.tsx`, `src/app/mon-espace/page.tsx` (utils authz), `src/lib/email/templates.ts` (échappement), `src/app/api/users/route.ts` (origine)

---

## Task 1: `next.config.ts` — authInterrupts + en-têtes de sécurité

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Remplacer `next.config.ts`**

```ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    authInterrupts: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur. (Le build complet est en Task 7.)

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "chore(security): enable authInterrupts and add security headers"
```

---

## Task 2: `src/proxy.ts` — barrière optimiste

**Files:**
- Create: `src/proxy.ts`

- [ ] **Step 1: Lire la doc proxy**

Run: `cat node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
Expected: confirmer la signature `export function proxy(request)` + `export const config = { matcher }`, runtime Node.

- [ ] **Step 2: Créer `src/proxy.ts`**

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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/dashboard/:path*", "/mon-espace/:path*"],
};
```

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur sur `src/proxy.ts`.
> Si `getSessionCookie` attend un type précis, il accepte `Request | Headers` (vérifié dans `better-auth/dist/cookies/index.d.mts`) ; `NextRequest` est un `Request`, donc OK.

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(authz): proxy.ts optimistic session guard on dashboard/mon-espace"
```

---

## Task 3: `src/lib/authz.ts` — utils d'autorisation serveur (avec cache)

**Files:**
- Create: `src/lib/authz.ts`

- [ ] **Step 1: Créer `src/lib/authz.ts`**

```ts
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
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur sur `src/lib/authz.ts`.
> Si `user.profileId` ou `user.role` ne sont pas typés sur le retour de `getSession` (selon l'inférence des additionalFields côté serveur), caster localement : `(user as { profileId: string }).profileId` et `(user.role ?? "user")`. Signaler si nécessaire.

- [ ] **Step 3: Commit**

```bash
git add src/lib/authz.ts
git commit -m "feat(authz): server auth utils with cached permission loading and requirePermission"
```

---

## Task 4: Page 403 `src/app/forbidden.tsx`

**Files:**
- Create: `src/app/forbidden.tsx`

- [ ] **Step 1: Lire la doc**

Run: `cat node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/forbidden.md`
Expected: confirmer que `app/forbidden.tsx` est rendu par l'appel `forbidden()`.

- [ ] **Step 2: Créer `src/app/forbidden.tsx`**

```tsx
import Link from "next/link";

import { BrandLogo } from "@/components/shared/brand-logo";

export default function Forbidden() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-4 text-center">
      <BrandLogo />
      <div>
        <p className="font-display text-5xl font-semibold text-primary">403</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-text">Accès refusé</h1>
        <p className="mt-2 max-w-md text-sm text-text-2">
          Vous n'avez pas les droits nécessaires pour accéder à cette section. Si vous pensez qu'il
          s'agit d'une erreur, contactez un administrateur.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-lg bg-primary px-5 py-2.5 font-sans text-sm font-semibold text-on-primary"
      >
        Retour au tableau de bord
      </Link>
    </main>
  );
}
```

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur. Vérifier que `BrandLogo` s'importe correctement.

- [ ] **Step 4: Commit**

```bash
git add src/app/forbidden.tsx
git commit -m "feat(authz): elegant 403 forbidden page"
```

---

## Task 5: Layout de zone + migration des pages dashboard/mon-espace

**Files:**
- Create: `src/app/dashboard/layout.tsx`
- Modify: `src/app/dashboard/page.tsx`, `src/app/mon-espace/page.tsx`

- [ ] **Step 1: Créer `src/app/dashboard/layout.tsx`**

```tsx
import { requireRole } from "@/lib/authz";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["admin", "staff"]);
  return <>{children}</>;
}
```

- [ ] **Step 2: Remplacer `src/app/dashboard/page.tsx`**

```tsx
import { getCurrentUser, requirePermission } from "@/lib/authz";

export default async function DashboardPage() {
  await requirePermission();
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-225 px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-text">Dashboard</h1>
      <p className="mt-2 text-text-2">Bonjour {user?.name} — le tableau de bord arrive au Lot 3.2.</p>
    </main>
  );
}
```

- [ ] **Step 3: Remplacer `src/app/mon-espace/page.tsx`**

```tsx
import { requireUser } from "@/lib/authz";

export default async function MonEspacePage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-225 px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-text">Mon espace</h1>
      <p className="mt-2 text-text-2">Bonjour {user.name} — cet espace arrive au Lot 3.4.</p>
    </main>
  );
}
```

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur.
> `requireRole` dans le layout gate toute la zone `/dashboard`. La page appelle `requirePermission()` (racine `/dashboard` toujours autorisée → renvoie l'user).

- [ ] **Step 5: Commit**

```bash
git add "src/app/dashboard/layout.tsx" "src/app/dashboard/page.tsx" "src/app/mon-espace/page.tsx"
git commit -m "feat(authz): dashboard zone guard and migrate stub pages to authz utils"
```

---

## Task 6: Durcissements sécurité (échappement email + vérif d'origine)

**Files:**
- Create: `src/lib/api/origin.ts`
- Modify: `src/lib/email/templates.ts`, `src/app/api/users/route.ts`

- [ ] **Step 1: Créer `src/lib/api/origin.ts`**

```ts
import { ApiError } from "@/lib/api/errors";

/**
 * Défense CSRF pour les routes mutantes : rejette si l'Origin ne correspond pas à l'hôte.
 * (Complément des cookies SameSite de Better Auth.)
 */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // navigations same-origin peuvent omettre Origin
  const host = req.headers.get("host");
  if (new URL(origin).host !== host) {
    throw new ApiError(403, "FORBIDDEN_ORIGIN", "Origine non autorisée.");
  }
}
```

- [ ] **Step 2: Modifier `src/lib/email/templates.ts` — échapper le nom**

Ajouter en haut du fichier (après les imports) :
```ts
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c];
  });
}
```

Dans `sendPasswordEmail`, remplacer la ligne `<p>Bonjour ${name},</p>` par :
```ts
        <p>Bonjour ${escapeHtml(name)},</p>
```
> `link` est construit par nous (token) → pas d'échappement nécessaire ; seul `name` provient d'une saisie.

- [ ] **Step 3: Modifier `src/app/api/users/route.ts` — vérif d'origine**

Ajouter l'import :
```ts
import { assertSameOrigin } from "@/lib/api/origin";
```
Dans le handler `POST`, en toute première ligne du corps (avant `getSession`) :
```ts
  assertSameOrigin(req);
```

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur sur les 3 fichiers.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/origin.ts src/lib/email/templates.ts src/app/api/users/route.ts
git commit -m "feat(security): escape email name, assert same-origin on POST /api/users"
```

---

## Task 7: Vérification globale (build + typecheck)

**Files:** aucun (vérification).

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build réussi. La sortie doit mentionner `proxy` (Proxy compilé) et lister `/dashboard`, `/mon-espace` (dynamic ƒ), plus les routes du Lot 2. Aucune erreur `authInterrupts`/`forbidden`.
> Warnings Better Auth « default secret » attendus (clé placeholder) — non bloquants.

- [ ] **Step 3: Lint (informatif)**

Run: `npm run lint`
Expected: pas de nouvelle erreur bloquante sur les fichiers créés.

- [ ] **Step 4: Commit (si ajustements)**

```bash
git add <fichiers ajustés>
git commit -m "fix(authz): resolve build/typecheck issues in Lot 3.1"
```

---

## Task 8: GATED — vérification end-to-end (nécessite DB seedée)

> Après T16 (Lot 1) + `.env` réel + au moins un profil STAFF avec permissions partielles.

- [ ] **Step 1: CLIENT sur `/dashboard`** → redirigé vers `/mon-espace`.
- [ ] **Step 2: Non connecté sur `/dashboard/xyz`** → redirigé vers `/connexion?redirect=/dashboard/xyz`.
- [ ] **Step 3: STAFF sans permission** sur une URL de menu non autorisé (tapée directement) → **page 403**.
- [ ] **Step 4: STAFF avec permission** → accède ; **ADMIN** → accède partout.
- [ ] **Step 5: Invalidation** — après `revalidateTag('permissions:'+profileId)`, un changement de droit s'applique immédiatement (test manuel via script).

---

## Self-Review (effectuée)

**1. Couverture du spec :**
- proxy.ts optimiste (§4) → Task 2 ✅
- authz utils + cache (§5, §9) → Task 3 ✅
- 403 (§6) → Tasks 1 (authInterrupts) + 4 (page) ✅
- guards zone + page (§6) → Task 5 ✅
- durcissements (§7) → Tasks 1 (headers) + 6 (email/origine) ✅
- blocage STAFF (§8) → Tasks 2+5+3 combinés ✅
- vérification (§11) → Tasks 7 (offline) + 8 (gated) ✅

**2. Placeholders :** aucun ; code complet fourni.

**3. Cohérence des types :** `x-pathname` posé par le proxy (Task 2) et lu par `requirePermission` (Task 3). `role`/`profileId` lus de façon cohérente (fallback documenté). Rôle `Role = "admin"|"staff"|"user"` cohérent avec le mapping du Lot 2. `ApiError` (Lot 2) réutilisé en Task 6. `AllowedMenu.can` structure identique entre `getStaffMenus`/`getAllMenus` et `matchMenu`/`requirePermission`.

**Risques connus (signalés) :** inférence TS de `profileId`/`role` sur `getSession` (fallback cast) ; `authInterrupts`/`forbidden()` sont experimental/canary (activés via next.config, fallback non nécessaire car doc confirmée).
