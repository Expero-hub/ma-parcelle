# Ma Parcelle

Plateforme de vente de parcelles au Bénin — Next.js 16 (App Router), Prisma 7, Better Auth,
Supabase (DB + Storage), Resend.

## Stack

- **Framework** : Next.js 16, React 19, Tailwind v4, shadcn/ui
- **ORM / DB** : Prisma 7 + PostgreSQL (Supabase)
- **Auth** : Better Auth (email/mot de passe, plugin admin)
- **Stockage** : Supabase Storage
- **Emails** : Resend
- **Formulaires / fetch** : react-hook-form + zod, SWR, axios

## Prérequis

- Node.js 20+
- Un projet **Supabase** (base Postgres + Storage)
- Un compte **Resend** avec un domaine d'envoi vérifié

## Installation

1. Installer les dépendances :
   ```bash
   npm install
   ```

2. Créer le fichier d'environnement et le renseigner :
   ```bash
   cp .env.example .env
   ```
   Puis remplir `.env` :
   - `DATABASE_URL` / `DIRECT_URL` : Supabase → Project Settings → Database → Connection string.
     `DATABASE_URL` = **Transaction pooler** (port 6543, ajouter `?pgbouncer=true`) ;
     `DIRECT_URL` = **Direct connection** (port 5432).
   - `BETTER_AUTH_SECRET` : `openssl rand -base64 32`
   - `RESEND_API_KEY`, `EMAIL_FROM` (expéditeur du domaine vérifié)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`
   - `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`

3. Créer les buckets Supabase Storage (Dashboard → Storage) :
   - `parcelle-images` — **public**
   - `user-avatars` — privé
   - `documents` — privé

4. Appliquer le schéma à la base et générer le client :
   ```bash
   npm run db:migrate      # crée les tables (migration initiale)
   npm run db:generate     # génère le client Prisma
   ```

5. Peupler la base (profils système, menus, premier admin) :
   ```bash
   npm run db:seed
   ```

6. Lancer l'application :
   ```bash
   npm run dev
   ```

## Scripts utiles

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run db:migrate` | Créer/appliquer une migration |
| `npm run db:generate` | Régénérer le client Prisma |
| `npm run db:seed` | (Re)jouer le seed (idempotent) |
| `npm run db:studio` | Explorer la base (Prisma Studio) |

## Le schéma (dossier `prisma/schema/`)

Le schéma est **multi-fichiers**, un fichier par domaine :

| Fichier | Domaine |
|---|---|
| `schema.prisma` | datasource + generator |
| `auth.prisma` | User, Session, Account, Verification (Better Auth) |
| `rbac.prisma` | Profile, Module, Menu, SubMenu, ProfilePermission |
| `org.prisma` | Company, Agency, PointOfSale + appartenances |
| `catalog.prisma` | Zone, Parcelle, ParcelleImage |
| `sales.prisma` | Contract, Reservation, Cancellation, Installment, Payment |
| `imports.prisma` | Import en masse (staging) |
| `config.prisma` | Constant (clé/valeur) |

> **Prisma 7** : l'URL de la base se déclare dans `prisma.config.ts` (`datasource.url = DIRECT_URL`
> pour les migrations), pas dans le schéma. Le runtime applicatif se connecte via l'adaptateur
> `@prisma/adapter-pg` avec `DATABASE_URL` (pooled) — voir `src/lib/prisma.ts`. Le client est
> généré dans `src/generated/prisma` (import : `@/generated/prisma/client`).

## Autorisation (RBAC)

- Chaque `User` a un `Profile` de type `ADMIN`, `CLIENT` ou `STAFF`.
- ADMIN et CLIENT sont des profils **système** (non supprimables).
- Les profils **STAFF** (gérant, gestionnaire…) sont créés librement et reçoivent des
  permissions **par menu** (`ProfilePermission` : create/read/update/delete).
- Le menu latéral du dashboard se construit depuis `Module → Menu → SubMenu`, filtré par les
  permissions du profil. Un **STAFF** ne voit que le périmètre de ses **agences / points de vente**.
- « Qui peut créer des utilisateurs » = simple permission `canCreate` sur le menu *Utilisateurs*.

## Conventions

- **Formulaires** : react-hook-form + zod (schémas partagés client/serveur dans `src/lib/validations/`).
- **Fetch client** : SWR (hooks dans `src/hooks/`).
- **Appels API** : helper axios centralisé `src/lib/http.ts` (à venir au Lot 2).
- **Backend** : validation zod systématique + enveloppe d'erreur standard.
- **IDs** : `cuid` (non énumérables). **Montants** : entiers FCFA. **Soft delete** : `deletedAt`.

## État d'avancement

- **Lot 1 — Fondations (fait)** : dépendances, schéma Prisma complet, `src/lib/prisma.ts`,
  `src/lib/auth.ts` (Better Auth minimal), `.env.example`, seed, ce README.
- **Lot 2 — Auth & RBAC (à venir)** : config Better Auth complète (email d'invitation via Resend,
  restriction de signup aux admins, access control), pages `connexion` / `reset mot de passe` /
  `définir mon mot de passe`, états du header (Connexion → Mon espace / Dashboard), guards serveur
  par permission.

## Recommandations pour la suite (prochains lots)

- **Lot 3+** : brancher le front sur la DB (remplacer le mock `src/lib/parcelles.ts`), réservations
  réelles, dashboard des modules, imports, facturation.
- **Sécurité** : ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` côté client ; buckets privés via
  signed URLs ; toujours revalider les permissions côté serveur (pas seulement masquer les menus).
- **Ajouter un menu/module** : insérer dans `prisma/seed.ts` (ou via l'écran *Modules & menus* une
  fois construit) puis accorder les permissions aux profils voulus.
- **Better Auth CLI** : `@better-auth/cli` est installé mais non requis au Lot 1 (le schéma auth est
  écrit à la main). Au Lot 2, vérifier la cohérence de version si on l'utilise pour régénérer le schéma.
