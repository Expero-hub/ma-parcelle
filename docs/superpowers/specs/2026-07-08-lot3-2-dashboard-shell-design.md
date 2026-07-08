# Lot 3.2 — Coquille du dashboard admin

**Date :** 2026-07-08
**Statut :** Design (en attente de relecture utilisateur avant plan)
**Projet :** `ma_parcelle` — Next.js 16 (App Router)
**Dépend de :** Lot 3.1 (authz : `requireRole`, `getUserMenus`, cache) + Lot 1 (Module/Menu hiérarchique/ProfilePermission).

---

## 1. Objectif & périmètre

Construire la **coquille** du dashboard : restructurer les layouts pour séparer la chrome
publique de celle du dashboard, puis fournir une **sidebar collapsible** (construite dynamiquement
depuis les menus autorisés) + une **topbar**, avec un placeholder « en construction » pour les
menus dont la feature n'existe pas encore.

### Hors périmètre

- Les vraies pages métier des menus (users, agences, contrats…) → lots 3.3+.
- Le scoping des données → Lot 3.3.
- L'espace client → Lot 3.4.

---

## 2. Décisions (validées)

1. **Groupe `(public)`** : `SiteHeader` sort du root layout ; accueil + `/parcelles` déplacés sous `(public)/`. Auth/dashboard/espace client ont leur propre chrome.
2. **Sidebar collapsible en rail d'icônes** (repliée) ↔ complète (dépliée) ; état persistant (localStorage) ; **tiroir off-canvas sur mobile**.
3. **Catch-all `/dashboard/[...slug]`** = page « Section en construction » élégante, gardée par `requirePermission()`.
4. **Navigation construite depuis la DB** (`getSidebarTree`), filtrée par permission, groupée par module, mise en cache (tags du 3.1).

---

## 3. Restructuration des layouts

**Avant :** `src/app/layout.tsx` (root) rend `SiteHeader` → visible partout (y compris dashboard/auth).

**Après :**
```
src/app/
  layout.tsx                 # root : <html><body> + providers (thème, toploader, fonts). PAS de SiteHeader.
  (public)/
    layout.tsx               # NOUVEAU : SiteHeader + {children}
    (accueil)/               # DÉPLACÉ depuis src/app/(accueil)/  → URL "/"
    parcelles/               # DÉPLACÉ depuis src/app/parcelles/  → URL "/parcelles"
  (auth)/                    # inchangé (layout carte centrée)
  dashboard/                 # layout propre (shell)
  mon-espace/                # layout/pages propres
```

- Les imports sont en `@/…` (absolus) → le déplacement ne casse aucun import.
- URLs inchangées (`(public)` et `(accueil)` sont des groupes sans segment d'URL).
- `parcelles/layout.tsx` (SiteFooter mini) et `(accueil)/page.tsx` (SiteFooter full) sont déplacés tels quels.

---

## 4. Données de navigation — `getSidebarTree`

Nouvelle fonction serveur (dans `src/lib/dashboard-nav.ts`), cachée par `unstable_cache` + `cache()`
(mêmes tags que le 3.1 : `permissions:<profileId>` / `menus:all`).

```ts
export type MenuNode = {
  id: string;
  name: string;
  url: string | null;
  icon: string | null;
  children: MenuNode[];
};
export type SidebarModule = { id: string; name: string; items: MenuNode[] };

export async function getSidebarTree(): Promise<SidebarModule[]>;
```

Logique :
- Charge les **modules actifs** avec leurs **menus actifs** (et `module` inclus).
- **ADMIN** : tous les menus. **STAFF** : uniquement les menus où `ProfilePermission.canRead=true` pour son profil.
- Construit l'arbre : menus racines (`parentId=null`) → enfants (`parentId`). Un menu parent est **visible** s'il est lui-même autorisé **ou** a au moins un enfant visible. Un module n'apparaît que s'il a au moins un menu visible.
- Trié par `order` (module, puis menu).

---

## 5. Sidebar — `src/components/dashboard/sidebar.tsx` (client)

- Reçoit l'arbre (`SidebarModule[]`) du layout serveur (les données restent serveur ; seule l'interaction est client).
- **Collapsible** : état `collapsed` (rail d'icônes ↔ complète), persistant en `localStorage`. Bouton de bascule dans la topbar.
- **Rail** : icônes seules + tooltip au survol. **Complète** : titre de module + libellés + sous-menus dépliables (accordéon).
- **Item actif** : surligné selon `usePathname()` (préfixe le plus long, cohérent avec `requirePermission`).
- **Mobile** : tiroir off-canvas (overlay), ouvert par un bouton hamburger de la topbar, fermé au clic sur un lien / l'overlay.
- **Icônes** : depuis le champ `icon` (noms lucide kebab-case seedés). Rendu via lucide-react — mécanisme exact (`DynamicIcon` de `lucide-react/dynamic` ou table de correspondance) **confirmé au plan** selon la version installée (`lucide-react@^1.23`). Fallback : icône générique si nom inconnu.
- Design system : surface `--surface`, accent admin `--navy`/`--primary`, bordures, focus visible.

## 6. Topbar — `src/components/dashboard/topbar.tsx`

- Bouton de repli de la sidebar (desktop) / hamburger (mobile).
- Titre de la section courante (dérivé du menu actif) ou fil d'Ariane simple.
- `ModeToggle` (clair/sombre, réutilisé).
- `UserMenu` (réutilisé du Lot 2 : initiales + déconnexion).

## 7. Pages

- **`src/app/dashboard/layout.tsx`** : garde `await requireRole(['admin','staff'])`, charge `getSidebarTree()`, rend `<Sidebar tree={…} />` + `<Topbar/>` + `<div>{children}</div>`.
- **`src/app/dashboard/page.tsx`** : accueil (message de bienvenue + placeholders de stats à venir). Garde `requirePermission()`.
- **`src/app/dashboard/[...slug]/page.tsx`** : catch-all « Section en construction » (illustration + libellé de la section), précédé de `await requirePermission()` — un STAFF hors périmètre reçoit un **403**, pas le placeholder. Les vraies pages (3.3…) prennent le dessus sur le catch-all.

---

## 8. Fichiers

**Créés :** `src/app/(public)/layout.tsx`, `src/lib/dashboard-nav.ts`, `src/components/dashboard/sidebar.tsx`, `src/components/dashboard/topbar.tsx`, `src/app/dashboard/[...slug]/page.tsx`.
**Déplacés :** `src/app/(accueil)/` → `src/app/(public)/(accueil)/` ; `src/app/parcelles/` → `src/app/(public)/parcelles/`.
**Modifiés :** `src/app/layout.tsx` (retrait `SiteHeader`), `src/app/dashboard/layout.tsx` (shell), `src/app/dashboard/page.tsx` (accueil).

---

## 9. Vérification & critères de succès

**Offline :**
1. `npx tsc --noEmit` sans erreur.
2. `npm run build` : `/` et `/parcelles` toujours présents (via `(public)`), dashboard dynamique, catch-all `/dashboard/[...slug]` présent. Aucun SiteHeader hérité par le dashboard (vérif structurelle).
3. Revue : `getSidebarTree` filtre par permission ; la sidebar ne fait pas de requête DB côté client (données passées par le serveur).

**Avec credentials (fin Lot 3) :**
4. ADMIN voit tous les modules/menus ; STAFF ne voit que ses menus autorisés.
5. Repli/dépli sidebar + persistance ; tiroir mobile ; item actif surligné.
6. Clic sur un menu sans page → « Section en construction » ; STAFF hors périmètre → 403.

---

## 10. Risque

- **Rendu réel non testable hors DB** : la sidebar dépend de `getSidebarTree` (DB). `tsc`+build garantissent la compilation ; le visuel complet sera validé end-to-end en fin de Lot 3.
- **Déplacement de fichiers WIP** : accueil + parcelles (non commités) sont déplacés sous `(public)/`. Les imports absolus `@/` protègent des cassures ; vérifier qu'aucun import relatif ne subsiste.
