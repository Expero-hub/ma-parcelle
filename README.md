# Ma Parcelle

Plateforme de vente de parcelles au Bénin — **Next.js 16** (App Router), **Prisma 7**, **Better Auth**,
**Supabase** (DB + Storage), **Resend** (emails).

Ce README est écrit pour un développeur qui **reprend le projet**. Il explique l'installation, la
sécurité, le système de rôles/permissions et le scoping, pour être opérationnel rapidement.

---

## 1. Stack

- **Framework** : Next.js 16, React 19, Tailwind v4, shadcn/ui, lucide-react
- **ORM / DB** : Prisma 7 + PostgreSQL (Supabase)
- **Auth** : Better Auth (email/mot de passe, plugin `admin`)
- **Stockage** : Supabase Storage
- **Emails** : Resend
- **Formulaires / fetch** : react-hook-form + zod, SWR, axios

## 2. Prérequis

- Node.js 20+
- Un projet **Supabase** (Postgres + Storage)
- Un compte **Resend** avec un **domaine d'envoi vérifié**

## 3. Installation

```bash
npm install
cp .env.example .env      # puis remplir (voir ci-dessous)
```

Renseigner `.env` :

| Variable | Où la trouver |
|---|---|
| `DATABASE_URL` | Supabase → Database → Connection string → **Transaction pooler** (port 6543, ajouter `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase → **Direct connection** (port 5432) — utilisé pour les migrations |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` en dev |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend (expéditeur = domaine vérifié) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | Vous choisissez — c'est le **premier admin** créé par le seed |

Créer les buckets Storage (Supabase → Storage) : `parcelle-images` (public), `user-avatars` (privé), `documents` (privé).

Puis :

```bash
npm run db:migrate -- --name init   # crée les tables
npm run db:generate                 # génère le client Prisma
npm run db:seed                     # profils système + 1er admin + menus (idempotent)
npm run dev
```

## 4. Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run db:migrate` | Créer/appliquer une migration |
| `npm run db:generate` | Régénérer le client Prisma |
| `npm run db:seed` | (Re)jouer le seed (idempotent) |
| `npm run db:studio` | Explorer la base (Prisma Studio) |

---

## 5. Le schéma (`prisma/schema/`)

Multi-fichiers, un par domaine. IDs `cuid` (non énumérables), montants en **entiers FCFA**,
**soft delete** via `deletedAt`, colonnes snake_case (`@map`).

| Fichier | Domaine |
|---|---|
| `schema.prisma` | datasource + generator |
| `auth.prisma` | User, Session, Account, Verification (gérés par Better Auth) |
| `rbac.prisma` | Profile, Module, **Menu (auto-référencé)**, ProfilePermission |
| `org.prisma` | Company, Agency, PointOfSale + appartenances (AgencyMember, PointOfSaleMember) |
| `catalog.prisma` | Zone, Parcelle, ParcelleImage |
| `sales.prisma` | Contract, Reservation, Cancellation, Installment, Payment |
| `imports.prisma` | Import en masse (staging) |
| `config.prisma` | Constant (clé/valeur) |

> **Prisma 7** : l'URL de la base est déclarée dans `prisma.config.ts` (`datasource.url = DIRECT_URL`),
> pas dans le schéma. Le runtime se connecte via l'adaptateur `@prisma/adapter-pg` (`DATABASE_URL`
> pooled) — voir `src/lib/prisma.ts`. Client généré dans `src/generated/prisma`
> (import : `@/generated/prisma/client`).

> **Note** : il n'y a **pas** de modèle `SubMenu`. Un `Menu` peut être racine (`parentId = null`) ou
> sous-menu (`parentId` renseigné) — hiérarchie auto-référencée.

---

## 6. Les 3 types de profil

Chaque `User` a **un** `Profile`. Le champ `Profile.type` vaut :

- **ADMIN** — accès total, aucun filtre. Profil **système** (non supprimable).
- **CLIENT** — utilisateur final (réservations/contrats). Profil **système**. Accède à `/mon-espace`.
- **STAFF** — tous les autres rôles (gérant, gestionnaire, agent…), **créés librement**. Leurs droits
  sont définis par les **ProfilePermission** (voir §7) et leur périmètre par le **scoping** (voir §8).

Better Auth porte aussi un champ `role` sur le user (`"admin"` / `"staff"` / `"user"`), dérivé du type
de profil à la création. Il sert de garde grossière (plugin admin) et à router le header
(client → *Mon espace*, admin/staff → *Dashboard*). La **vraie** autorisation fine est le système
ProfilePermission.

---

## 7. Permissions : `ProfilePermission` (mise en place & usage)

### Modèle

```
Module 1─* Menu 1─* Menu (enfants)        ProfilePermission
  (groupe)   (entrée dashboard, url)        ├── profileId  → Profile
                                            ├── menuId     → Menu
                                            └── canCreate / canRead / canUpdate / canDelete
```

- Les **menus** du dashboard sont **stockés en base** (table `Menu`), groupés en **modules**.
  Chaque menu a une `url` (ex. `/dashboard/utilisateurs`) et une `icon` (nom lucide).
- Une **`ProfilePermission`** lie un **profil** à un **menu** avec 4 droits **CRUD**
  (`canCreate/canRead/canUpdate/canDelete`). Contrainte unique `(profileId, menuId)`.
- **ADMIN** court-circuite tout (accès complet). **STAFF** ne voit/agit que sur les menus où il a le
  droit correspondant.

### Mettre en place des permissions

1. **Créer un menu/module** : dans `prisma/seed.ts` (bloc `MODULES`) ou, plus tard, via un écran
   d'admin *Modules & menus*. Un menu = `{ name, url, icon, order, children? }`.
2. **Créer un profil STAFF** : ajouter une ligne `Profile` (`type = STAFF`).
3. **Accorder les droits** : créer des `ProfilePermission` pour ce profil sur les menus voulus.
   Exemple (accès lecture + création sur *Utilisateurs*) :
   ```ts
   await prisma.profilePermission.create({
     data: { profileId, menuId, canRead: true, canCreate: true },
   });
   ```
   Le seed montre le pattern (idempotent) via `perm-${profileId}-${menuId}` comme `id`.

### Utiliser les permissions dans le code

- **Côté serveur (garde d'accès)** : `src/lib/authz.ts`
  - `requirePermission(action)` — en tête d'une **page** dashboard : vérifie le menu correspondant au
    chemin courant ; **403** si non autorisé.
  - `can(menuUrl, action)` — booléen réutilisable (garde d'API + affichage conditionnel UI).
  - `getUserMenus()` / `getSidebarTree()` — menus autorisés (pour construire la sidebar).
- **Côté UI** : la sidebar (`src/components/dashboard/`) n'affiche que les menus autorisés ; le bouton
  « Créer » n'apparaît que si `can(..., "create")`.

> ⚠️ **Le masquage d'un menu n'est PAS une sécurité.** La sécurité, c'est la **revalidation serveur**
> à chaque requête (voir §9). L'UI ne fait que du confort.

### Cache & invalidation

Les permissions/menus sont **cachés** (`unstable_cache`, tags `permissions:<profileId>` et
`menus:all`, TTL 300 s) + `cache()` React (intra-requête). **Après toute modification** de droits ou
de menus, appeler :
```ts
revalidateTag(`permissions:${profileId}`);  // droits d'un profil
revalidateTag("menus:all");                 // structure des menus
```
Sans invalidation, un changement met jusqu'à 300 s à s'appliquer.

---

## 8. Scoping (périmètre d'un STAFF)

Un STAFF ne voit/gère que **son périmètre**, de façon **hiérarchique** (`src/lib/scope.ts`) :

- Rattaché à une **agence** (`AgencyMember`) → il voit l'agence, **tous ses points de vente**, et **tous
  les users** rattachés à l'agence ou à ses PDV.
- Rattaché à un **point de vente** seul (`PointOfSaleMember`) → limité à ce PDV.
- Plusieurs rattachements → périmètres **cumulés**. **ADMIN** → aucun filtre.

Helpers : `getScopedAgencyIds`, `getScopedPointOfSaleIds`, `getScopedUserWhere` (clause Prisma pour
filtrer les listes), `assertWithinScope` (rejette une affectation hors périmètre).

**Règles de création** (`POST /api/users`) : un STAFF avec le droit *créer* ne peut créer que des
profils **non-ADMIN**, **dans son périmètre**, avec **au moins une** affectation agence/PDV. Seul un
ADMIN crée des admins et assigne partout. Tout est **revalidé serveur** (pas d'escalade possible).

---

## 9. Comment un STAFF est bloqué (défense en profondeur)

Cinq barrières, du plus grossier au plus fin :

1. **`proxy.ts`** — redirige vers `/connexion` si pas de cookie de session (aucune requête DB).
2. **`dashboard/layout.tsx`** — `requireRole(["admin","staff"])` : un CLIENT est renvoyé vers `/mon-espace`.
3. **Page** — `requirePermission()` : charge les menus autorisés du profil ; si le chemin ne correspond
   à **aucun** menu autorisé → **403** (même en tapant l'URL directement).
4. **Sidebar** — n'affiche que les liens autorisés (confort, pas sécurité).
5. **API** — chaque endpoint mutant revérifie `can(...)` + périmètre + non-escalade + **origine**
   (`assertSameOrigin`).

---

## 10. Sécurité (résumé)

- **Injection SQL** : Prisma génère des requêtes **paramétrées** ; aucun SQL brut.
- **Validation** : schémas **zod** dans `src/lib/validations/`, **partagés client ET serveur**
  (react-hook-form côté client, `.parse()` côté API). Erreurs normalisées via l'enveloppe
  `{ error: { code, message, fieldErrors? } }` (`src/lib/api/errors.ts`).
- **Mots de passe** : hashés par Better Auth (scrypt). **Jamais** envoyés par email — l'onboarding se
  fait par **lien d'invitation** (token de reset) où l'utilisateur définit son mot de passe.
- **CSRF** : cookies `SameSite` (Better Auth) + `assertSameOrigin` sur les mutations.
- **En-têtes** : `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` (`next.config.ts`).
- **Secrets** : `SUPABASE_SERVICE_ROLE_KEY` **serveur uniquement** ; buckets privés via signed URLs.
- **Désactivation d'un compte** : `banUser` (Better Auth) → **bloque réellement la connexion**.

---

## 11. Architecture (repères)

- **API-first** : l'auth passe par `/api/auth/[...all]` (Better Auth) et les endpoints custom
  (`/api/users`) — réutilisables par un futur client mobile. **Aucune server action.**
- **Client HTTP** : `src/lib/http.ts` (axios centralisé, erreurs normalisées).
- **Groupes de routes** : `(public)` (accueil, `/parcelles` + `SiteHeader`), `(auth)`
  (connexion/reset), `dashboard` (chrome admin), `mon-espace` (espace client). Le root layout ne
  contient que providers.
- **Coquille dashboard** : `src/components/dashboard/` (sidebar collapsible alimentée par
  `getSidebarTree`, topbar, shell). L'espace client réutilise cette coquille avec une nav statique.

---

## 12. État d'avancement

- **Lot 1 — Fondations** ✅ : dépendances, schéma Prisma complet, `.env.example`, seed, config.
- **Lot 2 — Auth & RBAC** ✅ : Better Auth complet, invitation email (Resend), pages
  connexion / mot-de-passe-oublié / nouveau-mot-de-passe, header conscient de la session.
- **Lot 3.1 — Autorisation & routes** ✅ : `proxy.ts`, `authz.ts` (rôle + permission + cache), 403.
- **Lot 3.2 — Coquille dashboard** ✅ : groupe `(public)`, sidebar collapsible dynamique, catch-all « en construction ».
- **Lot 3.3 — Gestion des utilisateurs** ✅ : scoping, liste scopée, création (invitation), activer/désactiver.
- **Lot 3.4 — Espace client** ✅ : coquille `/mon-espace` + pages (profil réel, placeholders).

> Les vérifications **end-to-end** (login, invitation, scoping réel, ban) nécessitent Supabase + Resend
> branchés (`.env` réel + `db:migrate` + `db:seed`). Le code compile et build sans credentials.

## 13. Recommandations pour la suite

- **Brancher les services** puis dérouler les scénarios E2E (voir les tâches « GATED » des plans dans
  `docs/superpowers/plans/`).
- **Prochaines features** : brancher le front public sur la DB (remplacer le mock `src/lib/parcelles.ts`),
  CRUD organisation (agences/PDV), réservations & contrats réels, écrans d'administration des
  profils/menus (avec `revalidateTag` à l'enregistrement).
- **Rôle `staff` typé** : aujourd'hui casté à l'appel de `createUser` ; pour en faire un rôle de
  première classe, configurer l'access-control du plugin `admin()` dans `src/lib/auth.ts`.
- **Toujours** : revalider les permissions **côté serveur**, ne jamais exposer la service role key,
  garder la validation zod partagée client/serveur.
