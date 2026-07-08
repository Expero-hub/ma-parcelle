# Lot 3.2 — Coquille du dashboard admin : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Restructurer les layouts (groupe `(public)`) puis construire la coquille du dashboard : sidebar collapsible (rail d'icônes) alimentée par les menus autorisés + topbar + catch-all « en construction ».

**Architecture:** Le layout serveur `/dashboard` charge l'arbre de navigation (`getSidebarTree`, filtré par permission, caché) et le passe à un `DashboardShell` client qui gère l'état de repli et rend `Sidebar` + `Topbar` + contenu. Les icônes viennent d'une table lucide explicite.

**Tech Stack:** Next.js 16 (route groups, catch-all), Prisma 7, React (client state), lucide-react 1.23, Tailwind v4.

**Référence spec :** `docs/superpowers/specs/2026-07-08-lot3-2-dashboard-shell-design.md`

**Vérification :** `npx tsc --noEmit` + `npm run build`. Rendu réel de la sidebar validé end-to-end en fin de Lot 3 (DB).

**Convention de commit :** `git add <chemins précis>` uniquement. WIP non lié présent → jamais `git add -A`/`.`.

**AGENTS.md :** APIs Next.js issues de la doc embarquée (route-groups.md déjà lu ; catch-all = `[...slug]`).

---

## File Structure

**Créés :** `src/app/(public)/layout.tsx`, `src/lib/dashboard-nav.ts`, `src/components/dashboard/menu-icon.tsx`, `src/components/dashboard/dashboard-shell.tsx`, `src/components/dashboard/sidebar.tsx`, `src/components/dashboard/topbar.tsx`, `src/app/dashboard/[...slug]/page.tsx`
**Déplacés :** `src/app/(accueil)/` → `src/app/(public)/(accueil)/` ; `src/app/parcelles/` → `src/app/(public)/parcelles/`
**Modifiés :** `src/app/layout.tsx` (retrait SiteHeader), `src/app/dashboard/layout.tsx` (shell), `src/app/dashboard/page.tsx`

---

## Task 1: Restructuration des layouts (groupe `(public)`)

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/(public)/layout.tsx`
- Move: `src/app/(accueil)/` → `src/app/(public)/(accueil)/`, `src/app/parcelles/` → `src/app/(public)/parcelles/`

> ⚠️ `(accueil)/` et `parcelles/` sont du **WIP non suivi** (untracked). On les DÉPLACE sur le disque (les imports sont en `@/…`, rien ne casse) mais on **NE les `git add` PAS** (ils restent WIP de l'utilisateur). On ne commite que `src/app/layout.tsx` et `src/app/(public)/layout.tsx`.

- [ ] **Step 1: Lire la doc route groups**

Run: `cat node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`
Expected: confirmer que `(public)` et `(accueil)` n'ajoutent pas de segment d'URL.

- [ ] **Step 2: Lire le root layout actuel**

Run: `cat src/app/layout.tsx`
Expected: repérer l'import et le rendu de `<SiteHeader />`.

- [ ] **Step 3: Déplacer accueil et parcelles sous `(public)/`**

```bash
mkdir -p "src/app/(public)"
git mv 2>/dev/null; true   # (no-op : fichiers untracked, on utilise mv)
mv "src/app/(accueil)" "src/app/(public)/(accueil)"
mv "src/app/parcelles" "src/app/(public)/parcelles"
```
> Sous PowerShell : `Move-Item "src/app/(accueil)" "src/app/(public)/(accueil)"` etc. Ne PAS utiliser `git mv` (fichiers untracked).

- [ ] **Step 4: Créer `src/app/(public)/layout.tsx`**

```tsx
import { SiteHeader } from "@/components/shared/site-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
```

- [ ] **Step 5: Retirer `SiteHeader` du root `src/app/layout.tsx`**

Supprimer l'import `import { SiteHeader } from "@/components/shared/site-header";` et la balise `<SiteHeader />` du JSX. Ne rien changer d'autre (providers, fonts, toploader, `{children}`).

- [ ] **Step 6: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur. (Build complet en Task 5.)

- [ ] **Step 7: Commit (uniquement nos fichiers)**

```bash
git add src/app/layout.tsx "src/app/(public)/layout.tsx"
git commit -m "refactor(layout): move SiteHeader into (public) route group"
```
> Les dossiers déplacés (`(accueil)`, `parcelles`) restent untracked — ne pas les committer.

---

## Task 2: `getSidebarTree` + table d'icônes

**Files:**
- Create: `src/lib/dashboard-nav.ts`, `src/components/dashboard/menu-icon.tsx`

- [ ] **Step 1: Créer `src/lib/dashboard-nav.ts`**

```ts
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
```

- [ ] **Step 2: Créer `src/components/dashboard/menu-icon.tsx`**

```tsx
import {
  Users, Shield, LayoutGrid, Building2, Store, MapPin, Map, LandPlot,
  Bookmark, FileText, CalendarClock, Wallet, Gauge, BarChart3, TrendingUp,
  Receipt, CircleDot, type LucideIcon,
} from "lucide-react";

/** Table des noms d'icônes seedés → composants lucide (imports nommés = stables). */
const ICONS: Record<string, LucideIcon> = {
  users: Users,
  shield: Shield,
  "layout-grid": LayoutGrid,
  "building-2": Building2,
  store: Store,
  "map-pin": MapPin,
  map: Map,
  "land-plot": LandPlot,
  bookmark: Bookmark,
  "file-text": FileText,
  "calendar-clock": CalendarClock,
  wallet: Wallet,
  gauge: Gauge,
  "bar-chart-3": BarChart3,
  "trending-up": TrendingUp,
  receipt: Receipt,
};

export function MenuIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || CircleDot;
  return <Icon className={className} aria-hidden />;
}
```

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur. (`user.role`/`user.profileId` typés — vérifié au Lot 3.1.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/dashboard-nav.ts src/components/dashboard/menu-icon.tsx
git commit -m "feat(dashboard): sidebar tree builder and lucide icon map"
```

---

## Task 3: Shell client — DashboardShell + Sidebar + Topbar

**Files:**
- Create: `src/components/dashboard/dashboard-shell.tsx`, `src/components/dashboard/sidebar.tsx`, `src/components/dashboard/topbar.tsx`

- [ ] **Step 1: Créer `src/components/dashboard/sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { SidebarModule, MenuNode } from "@/lib/dashboard-nav";
import { MenuIcon } from "@/components/dashboard/menu-icon";
import { BrandLogo } from "@/components/shared/brand-logo";

function isActive(pathname: string, url: string | null): boolean {
  if (!url) return false;
  return pathname === url || pathname.startsWith(url + "/");
}

function Item({ node, collapsed, pathname }: { node: MenuNode; collapsed: boolean; pathname: string }) {
  const active = isActive(pathname, node.url);
  const content = (
    <>
      <MenuIcon name={node.icon} className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{node.name}</span>}
    </>
  );
  const base =
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
    (active ? "bg-primary/10 text-primary" : "text-text-2 hover:bg-surface-2 hover:text-text");

  return (
    <li>
      {node.url ? (
        <Link href={node.url} className={base} title={collapsed ? node.name : undefined}>
          {content}
        </Link>
      ) : (
        <span className={base}>{content}</span>
      )}
      {!collapsed && node.children.length > 0 && (
        <ul className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">
          {node.children.map((c) => (
            <Item key={c.id} node={c} collapsed={false} pathname={pathname} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function Sidebar({
  tree,
  collapsed,
  mobileOpen,
  onCloseMobile,
}: {
  tree: SidebarModule[];
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onCloseMobile} aria-hidden />
      )}
      <aside
        className={
          "z-50 flex flex-col border-r border-border bg-surface transition-all " +
          "max-md:fixed max-md:inset-y-0 max-md:left-0 " +
          (mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full") +
          (collapsed ? " w-16" : " w-64")
        }
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          {collapsed ? <MenuIcon name="gauge" className="h-6 w-6 text-primary" /> : <BrandLogo />}
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {tree.map((mod) => (
            <div key={mod.id} className="mb-5">
              {!collapsed && (
                <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-text-2 uppercase">
                  {mod.name}
                </p>
              )}
              <ul className="flex flex-col gap-1" onClick={onCloseMobile}>
                {mod.items.map((node) => (
                  <Item key={node.id} node={node} collapsed={collapsed} pathname={pathname} />
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Créer `src/components/dashboard/topbar.tsx`**

```tsx
"use client";

import { Menu, PanelLeftClose, PanelLeft } from "lucide-react";

import { ModeToggle } from "@/components/shared/mode-toggle";
import { UserMenu } from "@/components/shared/user-menu";

export function Topbar({
  userName,
  collapsed,
  onToggleCollapse,
  onOpenMobile,
}: {
  userName: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Ouvrir le menu"
          className="rounded-lg p-2 text-text-2 hover:bg-surface-2 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
          className="hidden rounded-lg p-2 text-text-2 hover:bg-surface-2 md:inline-flex"
        >
          {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <ModeToggle />
        <UserMenu name={userName} />
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Créer `src/components/dashboard/dashboard-shell.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

import type { SidebarModule } from "@/lib/dashboard-nav";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export function DashboardShell({
  tree,
  userName,
  children,
}: {
  tree: SidebarModule[];
  userName: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("dash:collapsed") === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("dash:collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar
        tree={tree}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={userName}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur. Vérifier que `ModeToggle` et `UserMenu` s'importent (existants). Vérifier que les icônes `Menu`, `PanelLeftClose`, `PanelLeft` existent dans lucide-react 1.23 (sinon remplacer par un équivalent présent, ex. `ChevronsLeft`).

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/sidebar.tsx src/components/dashboard/topbar.tsx src/components/dashboard/dashboard-shell.tsx
git commit -m "feat(dashboard): collapsible sidebar, topbar and shell (client)"
```

---

## Task 4: Layout dashboard (shell) + accueil + catch-all « en construction »

**Files:**
- Modify: `src/app/dashboard/layout.tsx`, `src/app/dashboard/page.tsx`
- Create: `src/app/dashboard/[...slug]/page.tsx`

- [ ] **Step 1: Remplacer `src/app/dashboard/layout.tsx`**

```tsx
import { requireRole } from "@/lib/authz";
import { getSidebarTree } from "@/lib/dashboard-nav";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin", "staff"]);
  const tree = await getSidebarTree();
  return (
    <DashboardShell tree={tree} userName={user.name}>
      {children}
    </DashboardShell>
  );
}
```

- [ ] **Step 2: Remplacer `src/app/dashboard/page.tsx`**

```tsx
import { getCurrentUser, requirePermission } from "@/lib/authz";

export default async function DashboardPage() {
  await requirePermission();
  const user = await getCurrentUser();

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-display text-2xl font-semibold text-text">
        Bonjour {user?.name}
      </h1>
      <p className="mt-1 text-sm text-text-2">Bienvenue sur votre tableau de bord.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["Parcelles", "Réservations", "Contrats"].map((label) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-text-2">{label}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-text">—</p>
            <p className="mt-1 text-xs text-text-2">Statistiques à venir</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Créer `src/app/dashboard/[...slug]/page.tsx`**

```tsx
import { Construction } from "lucide-react";

import { requirePermission } from "@/lib/authz";

export default async function ConstructionPage() {
  await requirePermission();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
      <Construction className="h-12 w-12 text-primary" />
      <h1 className="font-display text-2xl font-semibold text-text">Section en construction</h1>
      <p className="max-w-md text-sm text-text-2">
        Cette section fait partie de votre périmètre mais n'est pas encore disponible. Elle arrivera
        dans un prochain lot.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur. Vérifier que l'icône `Construction` existe dans lucide-react 1.23 (sinon `HardHat` ou `Wrench`).

- [ ] **Step 5: Commit**

```bash
git add "src/app/dashboard/layout.tsx" "src/app/dashboard/page.tsx" "src/app/dashboard/[...slug]/page.tsx"
git commit -m "feat(dashboard): shell layout, home page and under-construction catch-all"
```

---

## Task 5: Vérification globale (build + typecheck)

**Files:** aucun (vérification).

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build réussi. Routes attendues : `/` et `/parcelles` (via `(public)`), `/dashboard`, `/dashboard/[...slug]` (dynamic), + routes des lots précédents. Aucune erreur d'import (déplacement accueil/parcelles OK). Warnings Better Auth « default secret » non bloquants.
> Vérifier qu'aucune route publique n'a régressé (accueil/parcelles compilent depuis leur nouvel emplacement).

- [ ] **Step 3: Lint (informatif)**

Run: `npm run lint`
Expected: pas de nouvelle erreur bloquante sur les fichiers créés.

- [ ] **Step 4: Commit (si ajustements)**

```bash
git add <fichiers ajustés>
git commit -m "fix(dashboard): resolve build/typecheck issues in Lot 3.2"
```

---

## Task 6: GATED — vérification visuelle end-to-end (nécessite DB seedée)

> Après branchement Supabase (fin Lot 3).

- [ ] ADMIN : la sidebar liste tous les modules/menus seedés (Administration, Organisation, Catalogue, Ventes, Exemples), sous-menu « Rapports » dépliable.
- [ ] STAFF : ne voit que ses menus autorisés.
- [ ] Repli/dépli (rail d'icônes) + persistance après refresh ; tiroir mobile ; item actif surligné.
- [ ] Clic sur un menu sans page → « Section en construction » ; STAFF hors périmètre (URL directe) → 403.
- [ ] Aucune chrome publique (SiteHeader) sur le dashboard ; header marketing présent sur `/` et `/parcelles`.

---

## Self-Review (effectuée)

**1. Couverture du spec :**
- Restructuration `(public)` (§3) → Task 1 ✅
- `getSidebarTree` (§4) → Task 2 ✅
- Sidebar collapsible + icônes + mobile + actif (§5) → Tasks 2 (icônes) + 3 ✅
- Topbar (§6) → Task 3 ✅
- Layout shell + accueil + catch-all (§7) → Task 4 ✅
- Vérification (§9) → Tasks 5 (offline) + 6 (gated) ✅

**2. Placeholders :** aucun ; code complet.

**3. Cohérence des types :** `SidebarModule`/`MenuNode` définis en Task 2, consommés en Task 3 (Sidebar) et Task 4 (layout). `getSidebarTree`/`requireRole`/`requirePermission`/`getCurrentUser` importés de leurs modules réels. `UserMenu`(name)/`ModeToggle` réutilisés du Lot 2. Règle « enfant orphelin → racine du module » documentée (Task 2).

**Risques (signalés dans les steps) :** noms d'icônes lucide 1.23 (`Menu`, `PanelLeft*`, `Construction`) à confirmer, fallback indiqué ; déplacement de fichiers WIP untracked (mv, pas `git mv`, pas de commit des déplacés).
