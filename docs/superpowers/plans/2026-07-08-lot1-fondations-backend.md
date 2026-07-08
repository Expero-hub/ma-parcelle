# Lot 1 — Fondations backend : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser les fondations backend de `ma_parcelle` : dépendances (Prisma 7, Better Auth, Supabase Storage, Resend, zod/rhf/swr/axios), config Prisma 7 multi-fichiers, schéma de données complet en anglais, `.env.example`, seed (1er admin + menus), et README de prise en main.

**Architecture:** Prisma 7 possède tout le schéma (métier + tables Better Auth) via un dossier `prisma/schema/` multi-fichiers ; runtime avec l'adaptateur `@prisma/adapter-pg` sur le pooler Supabase, migrations sur la connexion directe. Better Auth gère l'auth (tables `user/session/account/verification`) ; Supabase ne sert qu'à la DB + Storage (pas de Supabase Auth). Le seed crée les profils système, le premier admin (via l'API Better Auth pour un hash correct) et les modules/menus.

**Tech Stack:** Next.js 16, Prisma 7.8, `@prisma/adapter-pg`, Better Auth 1.6, Resend 6, `@supabase/supabase-js` 2, zod, react-hook-form, swr, axios, tsx.

**Référence spec :** `docs/superpowers/specs/2026-07-08-lot1-fondations-backend-design.md`

**Convention de commit :** chaque tâche stage **uniquement** ses propres fichiers (`git add <chemins précis>`) — le dépôt contient d'autres modifications non commitées qui ne doivent pas être emportées.

---

## File Structure

**Créés :**
- `prisma.config.ts` — config Prisma 7 (schéma multi-fichiers, seed, chargement env)
- `prisma/schema/schema.prisma` — datasource + generator uniquement
- `prisma/schema/auth.prisma` — User, Session, Account, Verification
- `prisma/schema/rbac.prisma` — Profile, Module, Menu, SubMenu, ProfilePermission
- `prisma/schema/org.prisma` — Company, Agency, PointOfSale, AgencyMember, PointOfSaleMember
- `prisma/schema/catalog.prisma` — Zone, Parcelle, ParcelleImage
- `prisma/schema/sales.prisma` — Contract, Reservation, Cancellation, Installment, Payment
- `prisma/schema/imports.prisma` — ImportFile, ImportedInstallment, ImportedPayment
- `prisma/schema/config.prisma` — Constant
- `prisma/seed.ts` — seed idempotent
- `src/lib/prisma.ts` — singleton PrismaClient + adaptateur pg
- `src/lib/auth.ts` — instance Better Auth (minimale, suffisante pour le seed ; enrichie au Lot 2)
- `.env.example` — modèle de variables d'environnement
- `.env` — valeurs locales (git-ignoré ; placeholders au départ)

**Modifiés :**
- `package.json` — dépendances + scripts `db:*`
- `.gitignore` — ignorer `src/generated/` et `.env`
- `README.md` — réécrit pour la prise en main

---

## Task 1: Installer les dépendances

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Installer les dépendances runtime**

Run:
```bash
npm install @prisma/client@7.8.0 @prisma/adapter-pg@7.8.0 better-auth@1.6.23 resend@6.17.2 @supabase/supabase-js@2.110.1 zod react-hook-form @hookform/resolvers swr axios
```
Expected: installation réussie, `package.json` mis à jour.

- [ ] **Step 2: Installer les dépendances de développement**

Run:
```bash
npm install -D prisma@7.8.0 @better-auth/cli tsx dotenv
```
Expected: installation réussie.

- [ ] **Step 3: Vérifier les versions installées**

Run: `npm ls prisma @prisma/client better-auth resend @supabase/supabase-js zod react-hook-form swr axios`
Expected: chaque paquet listé aux versions attendues (Prisma 7.8.0, better-auth 1.6.23, etc.), sans `UNMET DEPENDENCY`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install backend deps (prisma 7, better-auth, supabase, resend, zod, rhf, swr, axios)"
```

---

## Task 2: Ignorer le client généré et le `.env`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Vérifier le contenu actuel de `.gitignore`**

Run: `cat .gitignore`
Expected: fichier existant (généré par create-next-app). Noter s'il ignore déjà `.env*`.

- [ ] **Step 2: Ajouter les entrées manquantes**

Ajouter à la fin de `.gitignore` (ne pas dupliquer une ligne déjà présente) :
```gitignore

# Prisma generated client
/src/generated

# Local env
.env
```
> Next.js ignore souvent déjà `.env*` — dans ce cas, ne pas ré-ajouter `.env`. Toujours ajouter `/src/generated`.

- [ ] **Step 3: Vérifier**

Run: `git check-ignore src/generated/prisma .env`
Expected: les deux chemins sont retournés (donc ignorés).

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore prisma generated client and local .env"
```

---

## Task 3: Configuration Prisma 7 (datasource + generator + config)

**Files:**
- Create: `prisma/schema/schema.prisma`
- Create: `prisma.config.ts`

- [ ] **Step 1: Créer `prisma/schema/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client"
  output   = "../../src/generated/prisma"
  runtime  = "nodejs"
}

datasource db {
  provider = "postgresql"
}
```
> Prisma 7.8 **n'accepte plus** `url`/`directUrl` dans le bloc `datasource` du schéma (erreur P1012). L'URL est fournie via `prisma.config.ts` (Step 2). Le runtime utilise l'adaptateur pg avec `DATABASE_URL`.

- [ ] **Step 2: Créer `prisma.config.ts`**

```ts
import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema"),
  datasource: {
    url: process.env.DIRECT_URL,   // connexion directe pour les migrations Prisma CLI
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
```
> En Prisma 7, l'URL de la datasource se déclare ici (pas dans le schéma). On y met `DIRECT_URL` : les migrations passent par la connexion directe. Le runtime applicatif, lui, utilise l'adaptateur pg avec `DATABASE_URL` (pooled) dans `src/lib/prisma.ts`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema/schema.prisma prisma.config.ts
git commit -m "feat(prisma): datasource, prisma-client generator and prisma.config.ts"
```

> Note : `prisma validate` échouera tant qu'aucun modèle n'existe ? Non — un schéma avec datasource+generator seuls est valide. La validation complète intervient à la Task 10 après l'ajout des modèles.

---

## Task 4: Schéma `auth.prisma` (Better Auth + extensions)

**Files:**
- Create: `prisma/schema/auth.prisma`

- [ ] **Step 1: Créer `prisma/schema/auth.prisma`**

```prisma
/// Utilisateur unique de la plateforme (client, admin ou staff).
/// Table gérée par Better Auth, enrichie de champs métier + relation Profile.
/// Le mot de passe n'est PAS ici — il vit (hashé) dans Account.
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  role          String?
  banned        Boolean?  @default(false)
  banReason     String?
  banExpires    DateTime?

  firstName   String?  @map("first_name")
  lastName    String?  @map("last_name")
  phone       String?
  address     String?
  isValidated Boolean  @default(false) @map("is_validated")
  active      Boolean  @default(true)

  profileId String  @map("profile_id")
  profile   Profile @relation(fields: [profileId], references: [id])
  companyId String? @map("company_id")
  company   Company? @relation(fields: [companyId], references: [id])

  createdById  String? @map("created_by_id")
  createdBy    User?   @relation("UserCreatedBy", fields: [createdById], references: [id])
  createdUsers User[]  @relation("UserCreatedBy")

  sessions         Session[]
  accounts         Account[]
  agencyMembers    AgencyMember[]
  posMembers       PointOfSaleMember[]
  parcellesCreated Parcelle[]          @relation("ParcelleCreatedBy")
  reservations     Reservation[]
  contracts        Contract[]
  cancellations    Cancellation[]      @relation("CancellationBy")
  importFiles      ImportFile[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([profileId])
  @@index([companyId])
  @@map("users")
}

/// Session Better Auth. `impersonatedBy` ajouté par le plugin admin.
model Session {
  id             String   @id @default(cuid())
  expiresAt      DateTime
  token          String   @unique
  ipAddress      String?
  userAgent      String?
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  impersonatedBy String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([userId])
  @@map("sessions")
}

/// Compte d'authentification Better Auth (credential + OAuth futur).
/// Porte le mot de passe hashé (scrypt) pour le provider credential.
model Account {
  id                    String    @id @default(cuid())
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([userId])
  @@map("accounts")
}

/// Tokens de vérification Better Auth : vérification email, reset/invitation mot de passe.
model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([identifier])
  @@map("verifications")
}
```

- [ ] **Step 2: Commit**

```bash
git add prisma/schema/auth.prisma
git commit -m "feat(prisma): auth models (User, Session, Account, Verification)"
```

> `prisma validate` sera exécuté à la Task 10 (les modèles référencés — Profile, Company, etc. — n'existent pas encore).

---

## Task 5: Schéma `rbac.prisma` (profils, modules, menus, permissions)

**Files:**
- Create: `prisma/schema/rbac.prisma`

- [ ] **Step 1: Créer `prisma/schema/rbac.prisma`**

```prisma
enum ProfileType {
  ADMIN
  CLIENT
  STAFF
}

/// Profil = rôle d'un utilisateur. ADMIN et CLIENT sont des profils système
/// non supprimables. Les profils STAFF (gérant, gestionnaire, agent…) sont créés
/// librement et reçoivent des permissions via ProfilePermission.
model Profile {
  id          String      @id @default(cuid())
  name        String
  type        ProfileType
  description String?
  active      Boolean     @default(true)
  isSystem    Boolean     @default(false)

  users       User[]
  permissions ProfilePermission[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([type])
  @@map("profiles")
}

/// Regroupement logique de menus du dashboard (ex. "Administration", "Métier").
model Module {
  id     String  @id @default(cuid())
  name   String
  order  Int     @default(0)
  active Boolean @default(true)
  menus  Menu[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("modules")
}

/// Entrée de menu du dashboard, rattachée à un module. Peut avoir des sous-menus.
model Menu {
  id          String    @id @default(cuid())
  name        String
  moduleId    String    @map("module_id")
  module      Module    @relation(fields: [moduleId], references: [id])
  icon        String?
  url         String?
  order       Int       @default(0)
  active      Boolean   @default(true)
  submenus    SubMenu[]
  permissions ProfilePermission[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([moduleId])
  @@map("menus")
}

/// Sous-menu d'un menu.
model SubMenu {
  id          String  @id @default(cuid())
  menuId      String  @map("menu_id")
  menu        Menu    @relation(fields: [menuId], references: [id])
  name        String
  url         String?
  order       Int     @default(0)
  active      Boolean @default(true)
  permissions ProfilePermission[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([menuId])
  @@map("submenus")
}

/// Permission CRUD d'un profil sur un menu (ou sous-menu). C'est ici que se joue
/// "qui peut créer/voir/modifier/supprimer quoi" — y compris "qui peut créer des users".
model ProfilePermission {
  id        String   @id @default(cuid())
  profileId String   @map("profile_id")
  profile   Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  menuId    String   @map("menu_id")
  menu      Menu     @relation(fields: [menuId], references: [id], onDelete: Cascade)
  submenuId String?  @map("submenu_id")
  submenu   SubMenu? @relation(fields: [submenuId], references: [id], onDelete: Cascade)

  canCreate Boolean @default(false)
  canRead   Boolean @default(false)
  canUpdate Boolean @default(false)
  canDelete Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([profileId, menuId, submenuId])
  @@index([profileId])
  @@map("profile_permissions")
}
```

- [ ] **Step 2: Commit**

```bash
git add prisma/schema/rbac.prisma
git commit -m "feat(prisma): rbac models (Profile, Module, Menu, SubMenu, ProfilePermission)"
```

---

## Task 6: Schéma `org.prisma` (organisation & scoping)

**Files:**
- Create: `prisma/schema/org.prisma`

- [ ] **Step 1: Créer `prisma/schema/org.prisma`**

```prisma
/// Compagnie (niveau le plus haut de la hiérarchie organisationnelle).
model Company {
  id       String    @id @default(cuid())
  name     String
  address  String?
  phone    String?
  active   Boolean   @default(true)
  agencies Agency[]
  users    User[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@map("companies")
}

/// Agence rattachée à une compagnie. Unité principale de scoping du staff.
/// (Amélioration : ajout de companyId, absent du modèle brut.)
model Agency {
  id           String         @id @default(cuid())
  name         String
  phone        String?
  address      String?
  companyId    String         @map("company_id")
  company      Company        @relation(fields: [companyId], references: [id])
  active       Boolean        @default(true)
  pointsOfSale PointOfSale[]
  members      AgencyMember[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([companyId])
  @@map("agencies")
}

/// Point de vente rattaché à une agence. Second niveau de scoping.
model PointOfSale {
  id       String  @id @default(cuid())
  agencyId String  @map("agency_id")
  agency   Agency  @relation(fields: [agencyId], references: [id])
  name     String
  address  String?
  phone    String?
  active   Boolean @default(true)
  members  PointOfSaleMember[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([agencyId])
  @@map("points_of_sale")
}

/// Appartenance d'un utilisateur à une agence (M:N). Définit son périmètre.
model AgencyMember {
  id       String @id @default(cuid())
  userId   String @map("user_id")
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  agencyId String @map("agency_id")
  agency   Agency @relation(fields: [agencyId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, agencyId])
  @@index([agencyId])
  @@map("agency_members")
}

/// Appartenance d'un utilisateur à un point de vente (M:N).
model PointOfSaleMember {
  id            String      @id @default(cuid())
  userId        String      @map("user_id")
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  pointOfSaleId String      @map("point_of_sale_id")
  pointOfSale   PointOfSale @relation(fields: [pointOfSaleId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, pointOfSaleId])
  @@index([pointOfSaleId])
  @@map("point_of_sale_members")
}
```

- [ ] **Step 2: Commit**

```bash
git add prisma/schema/org.prisma
git commit -m "feat(prisma): org models (Company, Agency, PointOfSale, memberships)"
```

---

## Task 7: Schéma `catalog.prisma` (zones & parcelles)

**Files:**
- Create: `prisma/schema/catalog.prisma`

- [ ] **Step 1: Créer `prisma/schema/catalog.prisma`**

```prisma
enum ParcelleStatus {
  AVAILABLE
  RESERVED
  SOLD
}

/// Zone géographique (localisation cadastrale).
model Zone {
  id          String   @id @default(cuid())
  code        String
  fullAddress String?  @map("full_address")
  longitude   Decimal? @db.Decimal(10, 6)
  latitude    Decimal? @db.Decimal(10, 6)
  department  String?
  commune     String?
  district    String?
  active      Boolean  @default(true)
  parcelles   Parcelle[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@map("zones")
}

/// Parcelle mise en vente. `geom` = géométrie GeoJSON (polygone du terrain).
/// `createdById` = agent/créateur de la fiche (le réservant est sur Reservation).
model Parcelle {
  id            String         @id @default(cuid())
  reference     String         @unique
  area          Decimal        @db.Decimal(12, 2)
  price         Decimal        @db.Decimal(15, 0)
  status        ParcelleStatus @default(AVAILABLE)
  titleVerified Boolean        @default(false) @map("title_verified")
  description   String?
  geom          Json?
  block         String?
  lot           String?
  duration      Int?

  zoneId String @map("zone_id")
  zone   Zone   @relation(fields: [zoneId], references: [id])

  createdById String? @map("created_by_id")
  createdBy   User?   @relation("ParcelleCreatedBy", fields: [createdById], references: [id])

  images       ParcelleImage[]
  reservations Reservation[]
  contracts    Contract[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([status])
  @@index([zoneId])
  @@map("parcelles")
}

/// Image d'une parcelle (clé Supabase Storage).
model ParcelleImage {
  id         String   @id @default(cuid())
  parcelleId String   @map("parcelle_id")
  parcelle   Parcelle @relation(fields: [parcelleId], references: [id], onDelete: Cascade)
  path       String
  caption    String?
  isPrimary  Boolean  @default(false) @map("is_primary")
  order      Int      @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([parcelleId])
  @@map("parcelle_images")
}
```

- [ ] **Step 2: Commit**

```bash
git add prisma/schema/catalog.prisma
git commit -m "feat(prisma): catalog models (Zone, Parcelle, ParcelleImage)"
```

---

## Task 8: Schéma `sales.prisma` (contrats, réservations, facturation)

**Files:**
- Create: `prisma/schema/sales.prisma`

- [ ] **Step 1: Créer `prisma/schema/sales.prisma`**

```prisma
enum ContractStatus {
  DRAFT
  ACTIVE
  COMPLETED
  CANCELLED
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  CONVERTED
  CANCELLED
}

enum InstallmentStatus {
  PENDING
  PARTIAL
  PAID
  OVERDUE
}

enum Periodicity {
  MONTHLY
  QUARTERLY
  BIANNUAL
  ANNUAL
}

/// Contrat de vente d'une parcelle à un client (comptant ou échelonné).
model Contract {
  id                String         @id @default(cuid())
  reference         String         @unique
  totalAmount       Decimal        @map("total_amount") @db.Decimal(15, 0)
  status            ContractStatus @default(DRAFT)
  periodicity       Periodicity?
  installmentAmount Decimal?       @map("installment_amount") @db.Decimal(15, 0)
  startDate         DateTime?      @map("start_date")
  endDate           DateTime?      @map("end_date")
  isValidated       Boolean        @default(false) @map("is_validated")

  userId     String   @map("user_id")
  user       User     @relation(fields: [userId], references: [id])
  parcelleId String   @map("parcelle_id")
  parcelle   Parcelle @relation(fields: [parcelleId], references: [id])

  reservations Reservation[]
  installments Installment[]
  cancellation Cancellation?

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([userId])
  @@index([parcelleId])
  @@index([status])
  @@map("contracts")
}

/// Réservation d'une parcelle par un client (avant/pendant contractualisation).
/// `userId` = le client qui réserve.
model Reservation {
  id         String            @id @default(cuid())
  parcelleId String            @map("parcelle_id")
  parcelle   Parcelle          @relation(fields: [parcelleId], references: [id])
  userId     String            @map("user_id")
  user       User              @relation(fields: [userId], references: [id])
  contractId String?           @map("contract_id")
  contract   Contract?         @relation(fields: [contractId], references: [id])
  status     ReservationStatus @default(PENDING)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([parcelleId])
  @@index([userId])
  @@map("reservations")
}

/// Annulation d'une réservation et/ou d'un contrat (motif, auteur, pénalité).
model Cancellation {
  id            String    @id @default(cuid())
  contractId    String?   @unique @map("contract_id")
  contract      Contract? @relation(fields: [contractId], references: [id])
  reservationId String?   @map("reservation_id")
  reason        String?
  penaltyAmount Decimal?  @map("penalty_amount") @db.Decimal(15, 0)
  cancelledById String?   @map("cancelled_by_id")
  cancelledBy   User?     @relation("CancellationBy", fields: [cancelledById], references: [id])

  createdAt DateTime @default(now())

  @@map("cancellations")
}

/// Échéance (ex-"émission") générée depuis un contrat selon sa périodicité.
/// Chaque échéance couvre une période et attend un ou plusieurs Payment.
model Installment {
  id         String            @id @default(cuid())
  reference  String            @unique
  startDate  DateTime          @map("start_date")
  endDate    DateTime          @map("end_date")
  amount     Decimal           @db.Decimal(15, 0)
  status     InstallmentStatus @default(PENDING)
  contractId String            @map("contract_id")
  contract   Contract          @relation(fields: [contractId], references: [id])
  payments   Payment[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([contractId])
  @@index([status])
  @@map("installments")
}

/// Paiement (ex-"encaissement") reçu contre une échéance.
model Payment {
  id            String      @id @default(cuid())
  reference     String      @unique
  amount        Decimal     @db.Decimal(15, 0)
  paymentDate   DateTime    @map("payment_date")
  comment       String?
  agencyFee     Decimal?    @map("agency_fee") @db.Decimal(15, 0)
  installmentId String      @map("installment_id")
  installment   Installment @relation(fields: [installmentId], references: [id])

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([installmentId])
  @@map("payments")
}
```

- [ ] **Step 2: Commit**

```bash
git add prisma/schema/sales.prisma
git commit -m "feat(prisma): sales models (Contract, Reservation, Cancellation, Installment, Payment)"
```

---

## Task 9: Schémas `imports.prisma` + `config.prisma`

**Files:**
- Create: `prisma/schema/imports.prisma`
- Create: `prisma/schema/config.prisma`

- [ ] **Step 1: Créer `prisma/schema/imports.prisma`**

```prisma
/// Fichier importé (ex. Excel/CSV d'échéances ou de paiements) stocké sur Storage.
model ImportFile {
  id           String @id @default(cuid())
  name         String
  type         String
  path         String
  uploadedById String @map("uploaded_by_id")
  uploadedBy   User   @relation(fields: [uploadedById], references: [id])

  importedInstallments ImportedInstallment[]
  importedPayments     ImportedPayment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([uploadedById])
  @@map("import_files")
}

/// Ligne de staging d'échéance importée (avant validation/intégration).
model ImportedInstallment {
  id          String     @id @default(cuid())
  fileId      String     @map("file_id")
  file        ImportFile @relation(fields: [fileId], references: [id], onDelete: Cascade)
  contractRef String     @map("contract_ref")
  startDate   DateTime?  @map("start_date")
  endDate     DateTime?  @map("end_date")
  amount      Decimal?   @db.Decimal(15, 0)
  status      String?

  @@index([fileId])
  @@map("imported_installments")
}

/// Ligne de staging de paiement importé (avant validation/intégration).
model ImportedPayment {
  id             String     @id @default(cuid())
  fileId         String     @map("file_id")
  file           ImportFile @relation(fields: [fileId], references: [id], onDelete: Cascade)
  installmentRef String     @map("installment_ref")
  paymentDate    DateTime?  @map("payment_date")
  amount         Decimal?   @db.Decimal(15, 0)
  status         String?

  @@index([fileId])
  @@map("imported_payments")
}
```

- [ ] **Step 2: Créer `prisma/schema/config.prisma`**

```prisma
/// Paire clé/valeur de configuration applicative.
model Constant {
  id    String @id @default(cuid())
  key   String @unique
  value String

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@map("constants")
}
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema/imports.prisma prisma/schema/config.prisma
git commit -m "feat(prisma): imports staging + config models"
```

---

## Task 10: Valider le schéma & générer le client

**Files:**
- Create: `src/lib/prisma.ts`

- [ ] **Step 1: Valider le schéma complet**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema is valid 🚀`.
Si erreur de relation manquante, corriger le modèle concerné avant de continuer.

- [ ] **Step 2: Générer le client Prisma**

Run: `npx prisma generate`
Expected: `Generated Prisma Client` dans `src/generated/prisma`. Le dossier `src/generated/prisma` existe désormais.

- [ ] **Step 3: Créer le singleton `src/lib/prisma.ts`**

```ts
import { PrismaClient } from "@/generated/prisma/client";  // generator prisma-client → point d'entrée client.ts (pas de barrel index)
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur liée à `src/lib/prisma.ts` ni à l'import `@/generated/prisma`.
> Si `@/generated/prisma` n'est pas résolu, vérifier que `tsconfig.json` mappe `@/*` vers `src/*` (déjà le cas dans ce projet).

- [ ] **Step 5: Commit**

```bash
git add src/lib/prisma.ts
git commit -m "feat(prisma): validate schema, generate client, add prisma singleton"
```

---

## Task 11: Modèle d'environnement `.env.example` + `.env` local

**Files:**
- Create: `.env.example`
- Create: `.env`

- [ ] **Step 1: Créer `.env.example`**

```dotenv
# --- Base de données (Supabase Postgres) ---
# Pooler transaction (port 6543) — runtime Prisma Client
DATABASE_URL="postgres://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
# Connexion directe (port 5432) — migrations Prisma CLI
DIRECT_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"

# --- Better Auth ---
BETTER_AUTH_SECRET=""
BETTER_AUTH_URL="http://localhost:3000"

# --- Resend (emails invitation / reset mot de passe) ---
RESEND_API_KEY=""
EMAIL_FROM="no-reply@tondomaine.com"

# --- Supabase Storage (images + documents) ---
SUPABASE_URL="https://<ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY=""
NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"

# --- Seed (premier admin) ---
SEED_ADMIN_NAME="Administrateur"
SEED_ADMIN_EMAIL=""
SEED_ADMIN_PASSWORD=""
```

- [ ] **Step 2: Créer `.env` local (git-ignoré)**

Copier `.env.example` vers `.env` (l'utilisateur y mettra les vraies valeurs plus tard) :
```bash
cp .env.example .env
```

- [ ] **Step 3: Vérifier que `.env` est ignoré**

Run: `git status --porcelain .env`
Expected: **aucune sortie** (le fichier est ignoré). Si `.env` apparaît, corriger `.gitignore` (Task 2).

- [ ] **Step 4: Commit (uniquement l'exemple)**

```bash
git add .env.example
git commit -m "chore: add .env.example"
```

---

## Task 12: Instance Better Auth minimale (`src/lib/auth.ts`)

**Files:**
- Create: `src/lib/auth.ts`

> Objectif Lot 1 : une instance fonctionnelle **suffisante pour que le seed crée le premier admin avec un hash de mot de passe correct**. La configuration complète (hooks email d'invitation, restrictions de signup, access control fin) arrive au Lot 2.

- [ ] **Step 1: Créer `src/lib/auth.ts`**

```ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";

import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      firstName: { type: "string", required: false },
      lastName: { type: "string", required: false },
      phone: { type: "string", required: false },
      address: { type: "string", required: false },
      isValidated: { type: "boolean", required: false, defaultValue: false },
      active: { type: "boolean", required: false, defaultValue: true },
      profileId: { type: "string", required: true },
      companyId: { type: "string", required: false },
      createdById: { type: "string", required: false },
    },
  },
  plugins: [admin()],
});
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur dans `src/lib/auth.ts`.
> Note : `profileId` est déclaré `required: true`. Le seed devra fournir `profileId` lors de la création de l'admin (voir Task 14).

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat(auth): minimal better-auth instance (prisma adapter, admin plugin, additional fields)"
```

---

## Task 13: Scripts npm `db:*`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Ajouter les scripts dans `package.json`**

Dans la section `"scripts"`, ajouter (à la suite des scripts existants) :
```json
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio"
```
> Ne pas modifier les scripts existants (`dev`, `build`, `start`, `lint`).

- [ ] **Step 2: Vérifier**

Run: `npm run db:generate`
Expected: `Generated Prisma Client` (le script fonctionne).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add db:* npm scripts"
```

---

## Task 14: Seed (`prisma/seed.ts`)

**Files:**
- Create: `prisma/seed.ts`

> Le seed est **idempotent** : rejouable sans erreur. Il crée les profils système, le premier
> admin (via l'API Better Auth pour le hash), et les modules/menus + permissions ADMIN.

- [ ] **Step 1: Créer `prisma/seed.ts`**

```ts
import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { auth } from "../src/lib/auth";

/** Modules et menus de base du dashboard (+ quelques exemples). */
const MODULES: {
  name: string;
  order: number;
  menus: { name: string; url: string; icon: string; order: number }[];
}[] = [
  {
    name: "Administration",
    order: 1,
    menus: [
      { name: "Utilisateurs", url: "/dashboard/utilisateurs", icon: "users", order: 1 },
      { name: "Profils & permissions", url: "/dashboard/profils", icon: "shield", order: 2 },
      { name: "Modules & menus", url: "/dashboard/menus", icon: "layout-grid", order: 3 },
    ],
  },
  {
    name: "Organisation",
    order: 2,
    menus: [
      { name: "Compagnies", url: "/dashboard/compagnies", icon: "building-2", order: 1 },
      { name: "Agences", url: "/dashboard/agences", icon: "store", order: 2 },
      { name: "Points de vente", url: "/dashboard/points-de-vente", icon: "map-pin", order: 3 },
    ],
  },
  {
    name: "Catalogue",
    order: 3,
    menus: [
      { name: "Zones", url: "/dashboard/zones", icon: "map", order: 1 },
      { name: "Parcelles", url: "/dashboard/parcelles", icon: "land-plot", order: 2 },
    ],
  },
  {
    name: "Ventes",
    order: 4,
    menus: [
      { name: "Réservations", url: "/dashboard/reservations", icon: "bookmark", order: 1 },
      { name: "Contrats", url: "/dashboard/contrats", icon: "file-text", order: 2 },
      { name: "Échéances", url: "/dashboard/echeances", icon: "calendar-clock", order: 3 },
      { name: "Paiements", url: "/dashboard/paiements", icon: "wallet", order: 4 },
    ],
  },
  {
    // Menus d'exemple pour illustrer l'extension du système.
    name: "Exemples",
    order: 5,
    menus: [
      { name: "Tableau de bord", url: "/dashboard", icon: "gauge", order: 1 },
      { name: "Rapports", url: "/dashboard/rapports", icon: "bar-chart-3", order: 2 },
    ],
  },
];

async function seedProfiles() {
  const admin = await prisma.profile.upsert({
    where: { id: "profile-admin" },
    update: {},
    create: {
      id: "profile-admin",
      name: "Administrateur",
      type: "ADMIN",
      description: "Accès complet à la plateforme",
      isSystem: true,
    },
  });

  await prisma.profile.upsert({
    where: { id: "profile-client" },
    update: {},
    create: {
      id: "profile-client",
      name: "Client",
      type: "CLIENT",
      description: "Client final (réservations, contrats)",
      isSystem: true,
    },
  });

  return admin;
}

async function seedMenus() {
  const menuIds: string[] = [];

  for (const mod of MODULES) {
    const moduleId = `module-${mod.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    await prisma.module.upsert({
      where: { id: moduleId },
      update: { name: mod.name, order: mod.order },
      create: { id: moduleId, name: mod.name, order: mod.order },
    });

    for (const menu of mod.menus) {
      const menuId = `menu-${menu.url.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
      await prisma.menu.upsert({
        where: { id: menuId },
        update: { name: menu.name, url: menu.url, icon: menu.icon, order: menu.order, moduleId },
        create: {
          id: menuId,
          name: menu.name,
          url: menu.url,
          icon: menu.icon,
          order: menu.order,
          moduleId,
        },
      });
      menuIds.push(menuId);
    }
  }

  return menuIds;
}

async function grantAdminPermissions(profileId: string, menuIds: string[]) {
  for (const menuId of menuIds) {
    await prisma.profilePermission.upsert({
      where: {
        // clé composite unique (profileId, menuId, submenuId=null)
        profileId_menuId_submenuId: { profileId, menuId, submenuId: null },
      },
      update: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
      create: {
        profileId,
        menuId,
        submenuId: null,
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
    });
  }
}

async function seedAdminUser(adminProfileId: string) {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? "Administrateur";

  if (!email || !password) {
    console.warn(
      "[seed] SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD manquants — admin non créé. Renseignez-les dans .env puis relancez le seed.",
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[seed] Admin ${email} déjà présent — aucune action.`);
    return;
  }

  // Création via l'API Better Auth → hash scrypt correct dans Account.
  await auth.api.signUpEmail({
    body: { email, password, name, profileId: adminProfileId },
  });

  // Compléter les champs qui ne passent pas par le signup public.
  await prisma.user.update({
    where: { email },
    data: {
      role: "admin",
      emailVerified: true,
      isValidated: true,
      profileId: adminProfileId,
    },
  });

  console.log(`[seed] Admin ${email} créé.`);
}

async function main() {
  const adminProfile = await seedProfiles();
  const menuIds = await seedMenus();
  await grantAdminPermissions(adminProfile.id, menuIds);
  await seedAdminUser(adminProfile.id);
  console.log("[seed] Terminé.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 2: Vérifier la compilation TypeScript du seed**

Run: `npx tsc --noEmit`
Expected: aucune erreur dans `prisma/seed.ts`.
> Si `auth.api.signUpEmail` n'accepte pas `profileId` dans le type, c'est que les `additionalFields` ne sont pas inférés — dans ce cas, garder `profileId` dans l'appel (Better Auth l'accepte au runtime via additionalFields) et ajouter `// @ts-expect-error additionalFields` au-dessus de la ligne. Documenter ce point dans le README.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(prisma): idempotent seed (system profiles, base menus, admin permissions, first admin)"
```

> L'exécution réelle du seed (nécessitant la DB) est en Task 16.

---

## Task 15: README de prise en main

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Réécrire `README.md`**

````markdown
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

## Recommandations pour la suite (prochains lots)

- **Lot 2 — Auth & RBAC** : config Better Auth complète (email d'invitation via Resend, restriction
  de signup aux admins, access control), pages `connexion` / `reset mot de passe` / `définir mon
  mot de passe`, états du header (Connexion → Mon espace / Dashboard), guards serveur par permission.
- **Lot 3+** : brancher le front sur la DB (remplacer le mock `src/lib/parcelles.ts`), réservations
  réelles, dashboard des modules, imports, facturation.
- **Sécurité** : ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` côté client ; buckets privés via
  signed URLs ; toujours revalider les permissions côté serveur (pas seulement masquer les menus).
- **Ajouter un menu/module** : insérer dans `prisma/seed.ts` (ou via l'écran *Modules & menus* une
  fois construit) puis accorder les permissions aux profils voulus.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for onboarding (setup, schema, RBAC, conventions)"
```

---

## Task 16: Exécution avec credentials (migration + buckets + seed) — GATED

> **Cette tâche nécessite les vraies credentials Supabase/Resend dans `.env`.**
> À exécuter uniquement lorsque l'utilisateur a renseigné `.env` et créé le projet Supabase.
> Si les credentials ne sont pas disponibles, **s'arrêter après la Task 15** et signaler que
> le Lot 1 « hors-ligne » est complet ; cette tâche reste à faire par l'utilisateur.

**Files:** aucun fichier créé (exécution).

- [ ] **Step 1: Confirmer que `.env` est renseigné**

Run: `node -e "require('dotenv').config(); console.log(!!process.env.DATABASE_URL && !!process.env.DIRECT_URL && !!process.env.SEED_ADMIN_EMAIL)"`
Expected: `true`. Sinon, demander à l'utilisateur de compléter `.env`.

- [ ] **Step 2: Créer les buckets Storage**

Dans le Dashboard Supabase → Storage, créer : `parcelle-images` (public), `user-avatars` (privé), `documents` (privé).
Expected: 3 buckets visibles.

- [ ] **Step 3: Créer la migration initiale**

Run: `npm run db:migrate -- --name init`
Expected: migration `init` créée dans `prisma/migrations/`, appliquée sans erreur ; toutes les tables créées.

- [ ] **Step 4: Jouer le seed**

Run: `npm run db:seed`
Expected: logs `[seed] Admin <email> créé.` puis `[seed] Terminé.`

- [ ] **Step 5: Vérifier l'idempotence**

Run: `npm run db:seed`
Expected: logs `Admin <email> déjà présent — aucune action.` puis `[seed] Terminé.` (aucune erreur, aucun doublon).

- [ ] **Step 6: Vérifier en base**

Run: `npm run db:studio`
Expected: dans Prisma Studio — 2 `Profile` (ADMIN, CLIENT), les `Module`/`Menu` seedés, 1 `User` admin lié au profil ADMIN, des `ProfilePermission` en CRUD complet.

- [ ] **Step 7: Commit la migration**

```bash
git add prisma/migrations
git commit -m "feat(prisma): initial migration"
```

---

## Self-Review (effectuée)

**1. Couverture du spec :**
- Installs (§3) → Task 1 ✅
- Config Prisma 7 / generator / adaptateur / singleton (§4) → Tasks 3, 10 ✅
- `.env.example` (§5) → Task 11 ✅
- Schéma complet 8 fichiers (§7) → Tasks 3–9 ✅
- RBAC & scoping (§8) → modélisé (Tasks 5, 6) ; enforcement = Lot 2 (hors périmètre, noté) ✅
- Storage buckets (§9) → Task 16 (création) + README ✅
- Seed (§10) → Tasks 14, 16 ✅
- Conventions (§11) → figées dans README (Task 15) ; helpers = Lot 2 ✅
- README (§12) → Task 15 ✅
- Critères de succès (§13) → couverts par Tasks 10 (validate/generate), 16 (migrate/seed idempotent) ✅

**2. Placeholders :** aucun « TODO/TBD » ; tout le code des fichiers est fourni inline.

**3. Cohérence des types :** noms de modèles/champs/relations identiques entre schéma et seed
(`profilePermission.upsert` utilise la clé composite `profileId_menuId_submenuId` définie par
`@@unique([profileId, menuId, submenuId])` ; `auth.api.signUpEmail` reçoit `profileId` déclaré en
`additionalFields`). Les buckets (`parcelle-images`, `user-avatars`, `documents`) sont identiques
entre README et Task 16.

**Note de risque connue :** l'inférence TypeScript de `profileId` sur `auth.api.signUpEmail`
dépend de la version de Better Auth ; fallback documenté (Task 14, Step 2).
