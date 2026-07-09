# Lot 3.4 — Espace client

**Date :** 2026-07-08
**Statut :** Design approuvé (exécution inline)
**Dépend de :** Lot 3.2 (`DashboardShell`/`Sidebar`/`Topbar`, `MenuIcon`), Lot 3.1 (`requireUser`), Lot 2 (session, `UserMenu`).

## 1. Objectif & périmètre

Coquille de l'espace client (`/mon-espace`) pour les utilisateurs CLIENT : navigation + pages
(tableau de bord, réservations, contrats en placeholders, profil réel). **Réutilise** la coquille
du dashboard avec une **navigation statique** (les clients n'ont pas de menus DB/permissions).

Hors périmètre : les vraies réservations/contrats (features ultérieures).

## 2. Décisions (validées)

1. Réutiliser `DashboardShell` (sidebar collapsible, topbar, mobile) avec une nav **statique**.
2. Sections : Tableau de bord, Mes réservations, Mes contrats, Mon profil.
3. Réservations/Contrats = placeholders « à venir » ; Profil = infos réelles du compte.
4. Accès : tout utilisateur connecté (`requireUser`) ; le proxy gate déjà `/mon-espace/*`.

## 3. Structure

- **`src/app/mon-espace/layout.tsx`** : `requireUser()` → construit `CLIENT_NAV: SidebarModule[]` (statique) → rend `<DashboardShell tree={CLIENT_NAV} userName={user.name}>{children}</DashboardShell>`.
- **`CLIENT_NAV`** (statique, 1 module « Mon espace ») :
  - Tableau de bord → `/mon-espace` (icône `gauge`)
  - Mes réservations → `/mon-espace/reservations` (`bookmark`)
  - Mes contrats → `/mon-espace/contrats` (`file-text`)
  - Mon profil → `/mon-espace/profil` (`users`)
- **Pages** :
  - `/mon-espace/page.tsx` — accueil (bienvenue + cartes placeholder).
  - `/mon-espace/reservations/page.tsx`, `/mon-espace/contrats/page.tsx` — placeholders « à venir ».
  - `/mon-espace/profil/page.tsx` — infos réelles (`getCurrentUser` : nom, email, téléphone).

## 4. Réutilisation

`DashboardShell`/`Sidebar`/`Topbar`/`MenuIcon` inchangés (les icônes `gauge`/`bookmark`/`file-text`/`users`
existent déjà dans la table). Le layout mon-espace ne fait qu'injecter une nav statique → très peu de code neuf.

## 5. Vérification

`tsc` + `npm run build` ; routes `/mon-espace`, `/mon-espace/{reservations,contrats,profil}` présentes.
Rendu réel (session) validé end-to-end avec la DB.

## 6. Fichiers

**Créés :** `src/app/mon-espace/layout.tsx`, `src/app/mon-espace/reservations/page.tsx`, `src/app/mon-espace/contrats/page.tsx`, `src/app/mon-espace/profil/page.tsx`.
**Modifiés :** `src/app/mon-espace/page.tsx` (accueil enrichi).
