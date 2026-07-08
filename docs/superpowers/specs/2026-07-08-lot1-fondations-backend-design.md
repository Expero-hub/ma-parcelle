# Lot 1 — Fondations backend : Prisma 7 + Better Auth + Supabase + Resend

**Date :** 2026-07-08
**Statut :** Design validé (en attente de relecture utilisateur avant plan d'implémentation)
**Projet :** `ma_parcelle` — plateforme de vente de parcelles au Bénin (Next.js 16, App Router)

---

## 1. Objectif du Lot 1

Poser les **fondations backend** de l'application : installer et configurer les dépendances
(base de données, authentification, stockage, emails, formulaires, fetch), modéliser
**tout le schéma de données** en Prisma (multi-fichiers, nommage anglais, amélioré), fournir
un `.env.example`, un **seed** créant le premier admin + les menus de base, et un **README**
de prise en main pour un développeur débutant.

**Ce lot ne construit PAS** l'implémentation de l'auth ni les pages UI (→ Lot 2).

### Découpage global (rappel)

| Lot | Contenu | Statut |
|---|---|---|
| **Lot 1 — Fondations** | Installs + config + schéma Prisma complet + `.env.example` + seed + README | **Ce spec** |
| Lot 2 — Auth & RBAC | Config Better Auth, `createUser` + email d'invitation, pages connexion/reset/définir-mdp, états header, helpers (axios `http.ts`, handler d'erreurs, formulaires rhf+zod) | À venir |
| Lot 3+ | Métier (branchement front sur DB, réservations, contrats, dashboard modules…) | À venir |

---

## 2. Décisions d'architecture (validées)

1. **Modèle User unique** + relation `Profile` (le type/rôle est porté par le profil). Pas de tables Client/Admin séparées.
2. **Onboarding par lien d'invitation** : l'admin crée le compte → email (Resend) avec lien signé → l'utilisateur **définit lui-même** son mot de passe. On n'envoie jamais de mot de passe par email. (Implémentation = Lot 2.)
3. **IDs `String @id @default(cuid())`** partout (cohérent avec Better Auth, non énumérable).
4. **`Profile.type` = enum `ADMIN | CLIENT | STAFF`.** ADMIN & CLIENT = profils système non supprimables ; STAFF = rôles dynamiques (gérant, gestionnaire, agent…).
5. **Scoping** : un STAFF ne voit que le périmètre de ses **agences** et **points de vente** (join `AgencyMember` / `PointOfSaleMember`). Hiérarchie **Company > Agency > PointOfSale**.
6. **Montants en entiers FCFA** (`Decimal(15,0)`, pas de centimes).
7. **Schéma complet** modélisé dès maintenant (y compris facturation, imports, annulations, constants).
8. **Supabase = DB (via Prisma) + Storage uniquement.** L'auth est gérée par Better Auth → **pas** de Supabase Auth, **pas** de `@supabase/ssr`.
9. **Prisma possède tout le schéma**, y compris les tables Better Auth → une seule source de migrations.
10. **Helpers concrets** (axios, handler erreurs, formulaires) construits au **Lot 2** avec leurs premiers consommateurs. Conventions figées dès maintenant.

---

## 3. Dépendances (versions stables au 2026-07-08)

### Runtime
- `@prisma/client@7.8.0`
- `@prisma/adapter-pg@7.8.0` — adaptateur de driver requis par Prisma 7
- `better-auth@1.6.23`
- `resend@6.17.2`
- `@supabase/supabase-js@2.110.1` — **uniquement** pour le Storage
- `zod` — validation partagée client/serveur
- `react-hook-form` + `@hookform/resolvers` — formulaires
- `swr` — fetch client-side
- `axios` — appels API (helper sécurisé au Lot 2)

### Dev
- `prisma@7.8.0`
- `tsx` — exécuter `prisma.config.ts` et `prisma/seed.ts`
- `@better-auth/cli` — génération/vérification du schéma Better Auth

---

## 4. Fichiers de configuration & structure

```
ma_parcelle/
  prisma.config.ts            # Config Prisma 7 : charge l'env, pointe schema/, DIRECT_URL pour la CLI
  prisma/
    schema/                   # Schéma multi-fichiers
      schema.prisma           # datasource + generator UNIQUEMENT
      auth.prisma             # User, Session, Account, Verification (Better Auth)
      rbac.prisma             # Profile, Module, Menu, SubMenu, ProfilePermission
      org.prisma              # Company, Agency, PointOfSale, AgencyMember, PointOfSaleMember
      catalog.prisma          # Zone, Parcelle, ParcelleImage
      sales.prisma            # Contract, Reservation, Cancellation, Installment, Payment
      imports.prisma          # ImportFile, ImportedInstallment, ImportedPayment
      config.prisma           # Constant
    seed.ts                   # Seed : profils système + 1er admin + menus de base + exemples
  src/
    generated/prisma/         # Client Prisma généré (output du generator, git-ignoré)
    lib/
      prisma.ts               # Singleton PrismaClient + PrismaPg (pooled DATABASE_URL)
      auth.ts                 # Instance Better Auth (config complète = Lot 2)
  .env.example
  README.md                   # Enrichi : prise en main débutant
```

### `prisma/schema/schema.prisma` (datasource + generator)

```prisma
generator client {
  provider = "prisma-client"          // nouveau generator Prisma 7
  output   = "../../src/generated/prisma"
  runtime  = "nodejs"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")     // pooled (runtime)
  directUrl = env("DIRECT_URL")       // direct (migrations)
}
```

### `src/lib/prisma.ts` (extrait de principe)

```ts
import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = globalThis.__prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;
```

---

## 5. Variables d'environnement (`.env.example`)

```dotenv
# --- Base de données (Supabase Postgres) ---
# Pooler transaction (port 6543) — runtime Prisma Client
DATABASE_URL="postgres://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
# Connexion directe (port 5432) — migrations Prisma CLI
DIRECT_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"

# --- Better Auth ---
BETTER_AUTH_SECRET=""                       # openssl rand -base64 32
BETTER_AUTH_URL="http://localhost:3000"

# --- Resend (emails invitation / reset mot de passe) ---
RESEND_API_KEY=""
EMAIL_FROM="no-reply@tondomaine.com"        # expéditeur du domaine Resend vérifié

# --- Supabase Storage (images + documents) ---
SUPABASE_URL="https://<ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY=""                # serveur uniquement (upload / signed URLs)
NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"   # URLs publiques des images parcelles

# --- Seed (premier admin) ---
SEED_ADMIN_NAME="Administrateur"
SEED_ADMIN_EMAIL=""
SEED_ADMIN_PASSWORD=""                       # mot de passe fort ; changez-le après 1re connexion
```

---

## 6. Comment les pièces s'emboîtent

- **Prisma** possède l'intégralité du schéma (tables métier **et** Better Auth) → migrations uniques.
- **Better Auth** lit/écrit `user/session/account/verification` via l'adapter Prisma. Les champs custom du `User` (nos `firstName`, `profileId`, `companyId`…) sont déclarés en `additionalFields` dans la config Better Auth (Lot 2) et présents comme colonnes dans le schéma.
- **Deux couches d'autorisation :**
  1. **Better Auth `role`** (grossier) — porte d'entrée du plugin `admin` : qui peut appeler `createUser`, `banUser`, gérer les sessions. `role = "admin"` pour les profils ADMIN.
  2. **RBAC Profile → Module/Menu/SubMenu/ProfilePermission + scoping** (fin) — gouverne l'accès aux menus du dashboard, **revérifié côté serveur** même si l'utilisateur tape l'URL directement.
- **Resend** envoie les emails (invitation = lien de définition de mot de passe via le token de vérification/reset de Better Auth).
- **Supabase Storage** stocke les fichiers ; la DB ne garde que la **clé/chemin**.

> **Note RLS Supabase** : comme Prisma se connecte en direct (droits élevés), les policies RLS ne sont pas le mécanisme d'autorisation. **Toute l'autorisation est applicative** (Better Auth + notre RBAC). Les accès Storage passent par le serveur (service role) avec des **signed URLs** pour les buckets privés.

---

## 7. Modèle de données (schéma Prisma)

**Conventions :** modèles PascalCase, champs camelCase, `@@map`/`@map` → colonnes snake_case,
IDs `String @id @default(cuid())`, timestamps `createdAt`/`updatedAt`, soft delete `deletedAt DateTime?`,
`active Boolean @default(true)` (remplace les anciens `actif varchar`). **Commentaire `///` explicatif
au-dessus de chaque modèle.** Champ d'audit `createdById` sur les entités métier clés.

### 7.1 `auth.prisma` — Better Auth + extensions

```prisma
/// Utilisateur unique de la plateforme (client, admin ou staff).
/// Table gérée par Better Auth, enrichie de champs métier + relation Profile.
/// Le mot de passe n'est PAS ici — il vit (hashé) dans Account.
model User {
  id            String    @id @default(cuid())
  name          String                              // Better Auth (nom complet affiché)
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?                             // photo de profil (clé Storage)
  role          String?                             // plugin admin Better Auth : "admin" | null
  banned        Boolean?  @default(false)
  banReason     String?
  banExpires    DateTime?

  // --- Champs métier ---
  firstName   String?    @map("first_name")
  lastName    String?    @map("last_name")
  phone       String?
  address     String?
  isValidated Boolean    @default(false) @map("is_validated")  // ex-est_valide (validation compte/KYC)
  active      Boolean    @default(true)

  profileId String  @map("profile_id")
  profile   Profile @relation(fields: [profileId], references: [id])
  companyId String? @map("company_id")
  company   Company? @relation(fields: [companyId], references: [id])

  createdById String? @map("created_by_id")          // audit : quel admin a créé ce compte
  createdBy   User?   @relation("UserCreatedBy", fields: [createdById], references: [id])
  createdUsers User[] @relation("UserCreatedBy")

  // Relations inverses
  sessions        Session[]
  accounts        Account[]
  agencyMembers   AgencyMember[]
  posMembers      PointOfSaleMember[]
  parcellesCreated Parcelle[]      @relation("ParcelleCreatedBy")
  reservations    Reservation[]
  contracts       Contract[]
  cancellations   Cancellation[]   @relation("CancellationBy")
  importFiles     ImportFile[]

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

### 7.2 `rbac.prisma` — profils, modules, menus, permissions

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
  isSystem    Boolean     @default(false)     // true pour ADMIN/CLIENT → non supprimables

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
  id       String    @id @default(cuid())
  name     String
  moduleId String    @map("module_id")
  module   Module    @relation(fields: [moduleId], references: [id])
  icon     String?
  url      String?
  order    Int       @default(0)
  active   Boolean   @default(true)
  submenus SubMenu[]
  permissions ProfilePermission[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([moduleId])
  @@map("menus")
}

/// Sous-menu d'un menu.
model SubMenu {
  id     String  @id @default(cuid())
  menuId String  @map("menu_id")
  menu   Menu    @relation(fields: [menuId], references: [id])
  name   String
  url    String?
  order  Int     @default(0)
  active Boolean @default(true)
  permissions ProfilePermission[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([menuId])
  @@map("submenus")
}

/// Permission CRUD d'un profil sur un menu (ou sous-menu). C'est ici que se joue
/// "qui peut créer/voir/modifier/supprimer quoi" — y compris "qui peut créer des users".
model ProfilePermission {
  id        String  @id @default(cuid())
  profileId String  @map("profile_id")
  profile   Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  menuId    String  @map("menu_id")
  menu      Menu    @relation(fields: [menuId], references: [id], onDelete: Cascade)
  submenuId String? @map("submenu_id")
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

### 7.3 `org.prisma` — organisation & scoping

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
  id           String        @id @default(cuid())
  name         String
  phone        String?
  address      String?
  companyId    String        @map("company_id")
  company      Company       @relation(fields: [companyId], references: [id])
  active       Boolean       @default(true)
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
  id       String @id @default(cuid())
  agencyId String @map("agency_id")
  agency   Agency @relation(fields: [agencyId], references: [id])
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

### 7.4 `catalog.prisma` — zones & parcelles

```prisma
enum ParcelleStatus {
  AVAILABLE   // disponible
  RESERVED    // réservé
  SOLD        // vendu
}

/// Zone géographique (localisation cadastrale).
model Zone {
  id           String   @id @default(cuid())
  code         String
  fullAddress  String?  @map("full_address")
  longitude    Decimal? @db.Decimal(10, 6)
  latitude     Decimal? @db.Decimal(10, 6)
  department   String?
  commune      String?
  district     String?                            // ex-arrondissement
  active       Boolean  @default(true)
  parcelles    Parcelle[]

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
  area          Decimal        @db.Decimal(12, 2)   // superficie (m²)
  price         Decimal        @db.Decimal(15, 0)   // FCFA entiers
  status        ParcelleStatus @default(AVAILABLE)
  titleVerified Boolean        @default(false) @map("title_verified")  // "titre vérifié"
  description   String?
  geom          Json?                               // GeoJSON (Feature/Polygon)
  block         String?                             // ilot
  lot           String?
  duration      Int?                                // durée par défaut (mois) paiement échelonné

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
  path       String                                 // clé Storage
  caption    String?
  isPrimary  Boolean  @default(false) @map("is_primary")
  order      Int      @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([parcelleId])
  @@map("parcelle_images")
}
```

### 7.5 `sales.prisma` — contrats, réservations, facturation

```prisma
enum ContractStatus {
  DRAFT       // brouillon
  ACTIVE      // en cours
  COMPLETED   // soldé
  CANCELLED   // annulé
}

enum ReservationStatus {
  PENDING     // en attente
  CONFIRMED   // confirmée
  CONVERTED   // convertie en contrat
  CANCELLED   // annulée
}

enum InstallmentStatus {
  PENDING     // à payer
  PARTIAL     // partiellement payée
  PAID        // payée
  OVERDUE     // en retard
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
  totalAmount       Decimal        @db.Decimal(15, 0) @map("total_amount")
  status            ContractStatus @default(DRAFT)
  periodicity       Periodicity?
  installmentAmount Decimal?       @db.Decimal(15, 0) @map("installment_amount")
  startDate         DateTime?      @map("start_date")
  endDate           DateTime?      @map("end_date")
  isValidated       Boolean        @default(false) @map("is_validated")

  userId     String @map("user_id")               // client
  user       User   @relation(fields: [userId], references: [id])
  parcelleId String @map("parcelle_id")
  parcelle   Parcelle @relation(fields: [parcelleId], references: [id])

  reservations  Reservation[]
  installments  Installment[]
  cancellation  Cancellation?

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
  id            String   @id @default(cuid())
  contractId    String?  @unique @map("contract_id")
  contract      Contract? @relation(fields: [contractId], references: [id])
  reservationId String?  @map("reservation_id")
  reason        String?
  penaltyAmount Decimal? @db.Decimal(15, 0) @map("penalty_amount")
  cancelledById String?  @map("cancelled_by_id")
  cancelledBy   User?    @relation("CancellationBy", fields: [cancelledById], references: [id])

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
  id            String   @id @default(cuid())
  reference     String   @unique
  amount        Decimal  @db.Decimal(15, 0)
  paymentDate   DateTime @map("payment_date")
  comment       String?
  agencyFee     Decimal? @db.Decimal(15, 0) @map("agency_fee")
  installmentId String   @map("installment_id")
  installment   Installment @relation(fields: [installmentId], references: [id])

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([installmentId])
  @@map("payments")
}
```

### 7.6 `imports.prisma` — staging d'import en masse

```prisma
/// Fichier importé (ex. Excel/CSV d'échéances ou de paiements) stocké sur Storage.
model ImportFile {
  id           String @id @default(cuid())
  name         String
  type         String                             // "installments" | "payments" | ...
  path         String                             // clé Storage
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
  id          String   @id @default(cuid())
  fileId      String   @map("file_id")
  file        ImportFile @relation(fields: [fileId], references: [id], onDelete: Cascade)
  contractRef String   @map("contract_ref")
  startDate   DateTime? @map("start_date")
  endDate     DateTime? @map("end_date")
  amount      Decimal?  @db.Decimal(15, 0)
  status      String?

  @@index([fileId])
  @@map("imported_installments")
}

/// Ligne de staging de paiement importé (avant validation/intégration).
model ImportedPayment {
  id             String   @id @default(cuid())
  fileId         String   @map("file_id")
  file           ImportFile @relation(fields: [fileId], references: [id], onDelete: Cascade)
  installmentRef String   @map("installment_ref")
  paymentDate    DateTime? @map("payment_date")
  amount         Decimal?  @db.Decimal(15, 0)
  status         String?

  @@index([fileId])
  @@map("imported_payments")
}
```

### 7.7 `config.prisma` — constantes

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

### Correspondance modèle brut → schéma amélioré

| Brut (FR) | Modèle (EN) | Changements notables |
|---|---|---|
| profils | Profile | + `type` enum, `isSystem`, `description` |
| users | User | password → Account ; + firstName/lastName/phone/address/image ; agence_id scalaire retiré (→ AgencyMember) ; remember_token retiré ; + createdById |
| agences | Agency | + `companyId` (hiérarchie) |
| agence_user | AgencyMember | + unique(userId, agencyId) |
| point_ventes | PointOfSale | — |
| point_vente_user | PointOfSaleMember | + unique |
| zones | Zone | arrondissement → district |
| parcelles | Parcelle | + titleVerified, description ; user_id → createdById ; geom = GeoJSON ; status enum |
| images | ParcelleImage | + isPrimary, order, caption |
| contrats | Contract | status/periodicity enums |
| reservations | Reservation | + userId (réservant), status enum |
| annulations | Cancellation | motif, auteur, pénalité, liens contrat/réservation |
| emissions | Installment | renommé (échéance) |
| encaissements | Payment | renommé (paiement) |
| files | ImportFile | user_id → uploadedById |
| file_emissions | ImportedInstallment | — |
| file_encaissements | ImportedPayment | — |
| constances | Constant | — |
| modules/menus/sousmenus | Module/Menu/SubMenu | + order |
| profilpermissions | ProfilePermission | + unique(profileId,menuId,submenuId) |

---

## 8. RBAC & scoping (fonctionnement cible)

- **Qui peut créer qui** = permission ordinaire : le menu « Gestion des utilisateurs » avec `canCreate=true` dans le `ProfilePermission` du profil. ADMIN a tout ; un STAFF ne l'a que si coché. Pas de flag dédié.
- **Menu latéral du dashboard** : reconstruit dynamiquement depuis `Module → Menu → SubMenu`, filtré par les `ProfilePermission` du profil de l'utilisateur (là où `canRead=true`).
- **Guard serveur** : chaque route/action dashboard revérifie la permission requise ⇒ **403** si absente, **même en tapant l'URL**. (Implémentation Lot 2.)
- **Scoping des données** :
  - **ADMIN** : aucun filtre.
  - **CLIENT** : uniquement ses propres données (ses réservations/contrats).
  - **STAFF** : uniquement les entités de **ses** agences/points de vente (via `AgencyMember`/`PointOfSaleMember`). Ex. la liste des utilisateurs est filtrée aux membres des mêmes agences.

---

## 9. Supabase Storage

Trois buckets :

| Bucket | Accès | Contenu |
|---|---|---|
| `parcelle-images` | Public (lecture) | Photos des parcelles |
| `user-avatars` | Privé (signed URLs) | Photos de profil |
| `documents` | Privé (signed URLs) | Contrats signés, fichiers d'import, pièces |

La DB stocke la **clé** du fichier, jamais le binaire. Upload/lecture via `@supabase/supabase-js`
côté serveur avec la `SUPABASE_SERVICE_ROLE_KEY`. La création des buckets est documentée dans le README.

---

## 10. Seed (`prisma/seed.ts`)

Crée un état de départ minimal et **idempotent** (upserts) :

1. **Profils système** : `ADMIN` et `CLIENT` (`isSystem=true`, non supprimables).
2. **Premier admin** : créé **via l'API serveur Better Auth** (`auth.api` / plugin admin) pour un hash de mot de passe correct, à partir de `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME`. Rattaché au profil ADMIN, `role="admin"`, `emailVerified=true`.
3. **Modules & menus de base** du dashboard, ex. :
   - Module **Administration** : menus *Utilisateurs*, *Profils & permissions*, *Modules & menus*.
   - Module **Organisation** : menus *Compagnies*, *Agences*, *Points de vente*.
   - Module **Catalogue** : menus *Zones*, *Parcelles*.
   - Module **Ventes** : menus *Réservations*, *Contrats*, *Échéances*, *Paiements*.
   - **Menus d'exemple** supplémentaires (ex. *Tableau de bord*, *Rapports*) pour illustrer.
4. **Permissions** : `ProfilePermission` donnant au profil ADMIN le **CRUD complet** sur tous les menus.

> Le seed ne crée **aucune** donnée métier fictive (parcelles, contrats…) — le front garde son mock `parcelles.ts` jusqu'au lot de branchement.

---

## 11. Conventions transverses (figées, appliquées dès qu'il y a du code — surtout Lot 2)

- **Formulaires** : `react-hook-form` + `zod` via `@hookform/resolvers`. Schémas zod centralisés dans `src/lib/validations/`, **réutilisés client ET serveur** (validation double).
- **Fetch client** : `swr`, hooks dans `src/hooks/`.
- **Appels API** : helper `axios` centralisé (`src/lib/http.ts`, Lot 2) — instance unique, intercepteurs, gestion homogène des erreurs (réseau, 401/403/422/500), format d'erreur unifié.
- **Backend** : chaque route/Server Action valide ses entrées avec le schéma zod, renvoie une **enveloppe d'erreur standard**, et un handler central traite les erreurs habituelles (validation, auth, not-found, conflit, erreurs Prisma connues type P2002/P2025).

---

## 12. README (prise en main débutant)

Le `README.md` sera (ré)écrit en fin de Lot 1, structuré pour un développeur débutant :

1. Présentation du projet & stack.
2. Prérequis (Node, compte Supabase, compte Resend + domaine vérifié).
3. Setup pas-à-pas : cloner, `npm install`, créer le projet Supabase, récupérer les 2 URLs de connexion, créer les buckets Storage, configurer `.env`.
4. Commandes : `prisma migrate dev`, `prisma generate`, `prisma db seed`, `npm run dev`.
5. Tour du schéma (les 8 fichiers, à quoi sert chaque domaine).
6. Conventions du projet (formulaires, fetch, validation, erreurs, RBAC).
7. **Recommandations pour la suite** : ordre suggéré des prochains lots, points de vigilance sécurité, comment ajouter un menu/module, comment créer un profil STAFF.

Scripts `package.json` ajoutés : `db:migrate`, `db:generate`, `db:seed`, `db:studio`. La commande de seed est configurée dans **`prisma.config.ts`** (`migrations.seed`), conformément à Prisma 7 (la clé `prisma.seed` de `package.json` est dépréciée).

---

## 13. Critères de succès (vérifiables) du Lot 1

1. `npm install` réussit avec toutes les dépendances aux versions ciblées.
2. `npx prisma validate` passe sur le schéma multi-fichiers.
3. `npx prisma generate` produit le client dans `src/generated/prisma`.
4. Avec des credentials Supabase valides : `npx prisma migrate dev` crée toutes les tables.
5. `npx prisma db seed` crée les profils système, le premier admin (connexion possible au Lot 2), et les modules/menus + permissions ADMIN — **idempotent** (rejouable sans erreur).
6. `.env.example` liste toutes les variables nécessaires.
7. `README.md` permet à un débutant de reproduire le setup de bout en bout.

---

## 14. Hors périmètre (→ Lot 2 et suivants)

- Config Better Auth complète (providers, plugins admin, `additionalFields`, hooks email).
- Flux `createUser` par l'admin + email d'invitation (Resend) + page « définir mon mot de passe ».
- Pages : connexion, reset mot de passe, définir-mdp, états du header (Connexion / Mon espace / Dashboard + user button).
- Helpers `http.ts`, handler d'erreurs backend, premiers formulaires rhf+zod.
- Branchement du front (`parcelles.ts` mock → DB), réservations réelles, dashboard modules.
