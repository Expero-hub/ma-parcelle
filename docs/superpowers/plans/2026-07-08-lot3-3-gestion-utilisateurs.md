# Lot 3.3 — Gestion des utilisateurs (admin) : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Lister, créer et activer/désactiver des utilisateurs avec scoping hiérarchique et sans escalade de privilèges, en API-first (validation serveur systématique).

**Architecture:** Helpers de scoping (`scope.ts`) + `can()` (authz) gardent les endpoints `POST /api/users` (étendu : affectations + règles) et `PATCH /api/users/[id]` (ban/unban). Pages serveur scopées → composants client (table + formulaire rhf/zod) via `http.ts`.

**Tech Stack:** Next.js 16, Prisma 7, Better Auth 1.6 (admin: createUser/banUser/unbanUser), zod, react-hook-form, axios.

**Référence spec :** `docs/superpowers/specs/2026-07-08-lot3-3-gestion-utilisateurs-design.md`

**Vérification :** `npx tsc --noEmit` + `npm run build`. Comportement réel (scoping, invitation, ban) → end-to-end avec DB (fin Lot 3).

**Commit :** `git add <chemins précis>` uniquement. Jamais `git add -A`/`.`.

---

## File Structure

**Créés :** `src/lib/scope.ts`, `src/app/api/users/[id]/route.ts`, `src/app/dashboard/utilisateurs/page.tsx`, `src/app/dashboard/utilisateurs/_components/users-table.tsx`, `src/app/dashboard/utilisateurs/nouveau/page.tsx`, `src/app/dashboard/utilisateurs/nouveau/_components/create-user-form.tsx`
**Modifiés :** `src/lib/authz.ts` (`can`), `src/lib/validations/auth.ts` (schémas), `src/app/api/users/route.ts` (extension)

---

## Task 1: Helpers de scoping (`src/lib/scope.ts`)

**Files:** Create: `src/lib/scope.ts`

- [ ] **Step 1: Créer `src/lib/scope.ts`**

```ts
import { cache } from "react";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api/errors";

export type ScopedUser = { id: string; role?: string | null; profileId: string };

function isAdmin(user: ScopedUser): boolean {
  return (user.role ?? "user") === "admin";
}

/** Agences dont l'utilisateur est membre direct. ADMIN → null (toutes). */
export const getScopedAgencyIds = cache(async (user: ScopedUser): Promise<string[] | null> => {
  if (isAdmin(user)) return null;
  const members = await prisma.agencyMember.findMany({
    where: { userId: user.id },
    select: { agencyId: true },
  });
  return members.map((m) => m.agencyId);
});

/** PDV membres directs + tous les PDV des agences de l'utilisateur. ADMIN → null. */
export const getScopedPointOfSaleIds = cache(async (user: ScopedUser): Promise<string[] | null> => {
  if (isAdmin(user)) return null;
  const agencyIds = (await getScopedAgencyIds(user)) ?? [];
  const [direct, viaAgency] = await Promise.all([
    prisma.pointOfSaleMember.findMany({ where: { userId: user.id }, select: { pointOfSaleId: true } }),
    agencyIds.length
      ? prisma.pointOfSale.findMany({ where: { agencyId: { in: agencyIds } }, select: { id: true } })
      : Promise.resolve([] as { id: string }[]),
  ]);
  return Array.from(new Set([...direct.map((d) => d.pointOfSaleId), ...viaAgency.map((p) => p.id)]));
});

/** Clause Prisma « users du périmètre ». ADMIN → {} (aucun filtre). */
export async function getScopedUserWhere(user: ScopedUser): Promise<Prisma.UserWhereInput> {
  if (isAdmin(user)) return {};
  const [agencyIds, posIds] = await Promise.all([
    getScopedAgencyIds(user),
    getScopedPointOfSaleIds(user),
  ]);
  return {
    OR: [
      { agencyMembers: { some: { agencyId: { in: agencyIds ?? [] } } } },
      { posMembers: { some: { pointOfSaleId: { in: posIds ?? [] } } } },
    ],
  };
}

/** Lève 403 si une affectation sort du périmètre (ignoré pour ADMIN). */
export async function assertWithinScope(
  user: ScopedUser,
  sel: { agencyIds?: string[]; pointOfSaleIds?: string[] },
): Promise<void> {
  if (isAdmin(user)) return;
  const [agencyIds, posIds] = await Promise.all([
    getScopedAgencyIds(user),
    getScopedPointOfSaleIds(user),
  ]);
  const allowedA = new Set(agencyIds ?? []);
  const allowedP = new Set(posIds ?? []);
  for (const a of sel.agencyIds ?? []) {
    if (!allowedA.has(a)) throw new ApiError(403, "OUT_OF_SCOPE", "Agence hors de votre périmètre.");
  }
  for (const p of sel.pointOfSaleIds ?? []) {
    if (!allowedP.has(p)) throw new ApiError(403, "OUT_OF_SCOPE", "Point de vente hors de votre périmètre.");
  }
}
```

- [ ] **Step 2: Vérifier** — Run: `npx tsc --noEmit` → aucune erreur.
- [ ] **Step 3: Commit**
```bash
git add src/lib/scope.ts
git commit -m "feat(scope): hierarchical scoping helpers for staff perimeter"
```

---

## Task 2: `can()` dans `src/lib/authz.ts`

**Files:** Modify: `src/lib/authz.ts`

- [ ] **Step 1: Ajouter `can` à la fin de `src/lib/authz.ts`**

```ts
/**
 * ADMIN → true. Sinon vérifie le droit `action` du profil sur le menu exact `menuUrl`.
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
```

- [ ] **Step 2: Vérifier** — Run: `npx tsc --noEmit` → aucune erreur.
- [ ] **Step 3: Commit**
```bash
git add src/lib/authz.ts
git commit -m "feat(authz): can() permission helper for API and UI guards"
```

---

## Task 3: Schémas zod (`src/lib/validations/auth.ts`)

**Files:** Modify: `src/lib/validations/auth.ts`

- [ ] **Step 1: Remplacer le bloc `createUserSchema` et ajouter `toggleUserSchema`**

Remplacer la définition existante de `createUserSchema` (et son type) par :
```ts
export const createUserSchema = z.object({
  email: z.string().email("Email invalide."),
  firstName: z.string().min(1, "Prénom requis."),
  lastName: z.string().min(1, "Nom requis."),
  phone: z.string().optional(),
  profileId: z.string().min(1, "Profil requis."),
  companyId: z.string().optional(),
  agencyIds: z.array(z.string()).optional().default([]),
  pointOfSaleIds: z.array(z.string()).optional().default([]),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const toggleUserSchema = z.object({ active: z.boolean() });
export type ToggleUserInput = z.infer<typeof toggleUserSchema>;
```

- [ ] **Step 2: Vérifier** — Run: `npx tsc --noEmit` → aucune erreur (le POST actuel utilise déjà `createUserSchema` ; les nouveaux champs sont optionnels).
- [ ] **Step 3: Commit**
```bash
git add src/lib/validations/auth.ts
git commit -m "feat(validation): extend createUserSchema with assignments, add toggleUserSchema"
```

---

## Task 4: Extension `POST /api/users`

**Files:** Modify: `src/app/api/users/route.ts`

- [ ] **Step 1: Remplacer le contenu de `src/app/api/users/route.ts`**

```ts
import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { can } from "@/lib/authz";
import { assertWithinScope } from "@/lib/scope";
import { createUserSchema } from "@/lib/validations/auth";

function randomPassword(): string {
  return randomBytes(24).toString("base64url") + "aA1!";
}

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
  if (!(await can("/dashboard/utilisateurs", "create"))) {
    throw new ApiError(403, "FORBIDDEN", "Vous n'avez pas le droit de créer des utilisateurs.");
  }

  const creator = session.user;
  const creatorIsAdmin = (creator.role ?? "user") === "admin";
  const body = createUserSchema.parse(await req.json());

  const profile = await prisma.profile.findUnique({
    where: { id: body.profileId },
    select: { type: true },
  });
  if (!profile) {
    throw new ApiError(422, "INVALID_PROFILE", "Profil introuvable.", { profileId: "Profil invalide." });
  }
  const role = profile.type === "ADMIN" ? "admin" : profile.type === "STAFF" ? "staff" : "user";

  if (!creatorIsAdmin) {
    if (profile.type === "ADMIN") {
      throw new ApiError(403, "NO_ESCALATION", "Vous ne pouvez pas créer d'administrateur.");
    }
    await assertWithinScope(creator, {
      agencyIds: body.agencyIds,
      pointOfSaleIds: body.pointOfSaleIds,
    });
    if (body.agencyIds.length === 0 && body.pointOfSaleIds.length === 0) {
      throw new ApiError(422, "SCOPE_REQUIRED", "Au moins une agence ou un point de vente est requis.", {
        agencyIds: "Sélectionnez au moins une affectation.",
      });
    }
  }

  const created = await auth.api.createUser({
    body: {
      email: body.email,
      password: randomPassword(),
      name: `${body.firstName} ${body.lastName}`.trim(),
      role: role as "user" | "admin",
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        profileId: body.profileId,
        companyId: body.companyId,
        createdById: creator.id,
      },
    },
    headers: h,
  });
  const userId = created.user.id;

  try {
    await prisma.$transaction([
      ...body.agencyIds.map((agencyId) => prisma.agencyMember.create({ data: { userId, agencyId } })),
      ...body.pointOfSaleIds.map((pointOfSaleId) =>
        prisma.pointOfSaleMember.create({ data: { userId, pointOfSaleId } }),
      ),
    ]);
  } catch {
    // Compensation : Better Auth a déjà créé le compte hors transaction Prisma.
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    throw new ApiError(500, "CREATE_FAILED", "Échec de l'affectation ; création annulée.");
  }

  await auth.api.requestPasswordReset({
    body: { email: body.email, redirectTo: "/nouveau-mot-de-passe" },
  });

  return Response.json({ data: { id: userId, email: created.user.email } }, { status: 201 });
});
```

- [ ] **Step 2: Vérifier** — Run: `npx tsc --noEmit` → aucune erreur.
> Si `created.user` n'est pas la forme réelle du retour de `createUser`, adapter (`created.user.id`/`created.user.email`).

- [ ] **Step 3: Commit**
```bash
git add src/app/api/users/route.ts
git commit -m "feat(api): extend POST /api/users with scoped assignments and anti-escalation guards"
```

---

## Task 5: `PATCH /api/users/[id]` — activer/désactiver

**Files:** Create: `src/app/api/users/[id]/route.ts`

- [ ] **Step 1: Créer `src/app/api/users/[id]/route.ts`**

```ts
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { can } from "@/lib/authz";
import { getScopedUserWhere } from "@/lib/scope";
import { toggleUserSchema } from "@/lib/validations/auth";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
    if (!(await can("/dashboard/utilisateurs", "update"))) {
      throw new ApiError(403, "FORBIDDEN", "Droit insuffisant.");
    }

    const requester = session.user;
    const requesterIsAdmin = (requester.role ?? "user") === "admin";
    const body = toggleUserSchema.parse(await req.json());

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!target) throw new ApiError(404, "NOT_FOUND", "Utilisateur introuvable.");

    if (!requesterIsAdmin) {
      if (target.role === "admin") throw new ApiError(403, "FORBIDDEN", "Action non autorisée.");
      const where = await getScopedUserWhere(requester);
      const inScope = await prisma.user.findFirst({ where: { AND: [{ id }, where] }, select: { id: true } });
      if (!inScope) throw new ApiError(403, "OUT_OF_SCOPE", "Utilisateur hors de votre périmètre.");
    }

    if (body.active === false) {
      await auth.api.banUser({ body: { userId: id }, headers: h });
      await prisma.user.update({ where: { id }, data: { active: false } });
    } else {
      await auth.api.unbanUser({ body: { userId: id }, headers: h });
      await prisma.user.update({ where: { id }, data: { active: true } });
    }

    return Response.json({ data: { id, active: body.active } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
```

- [ ] **Step 2: Vérifier** — Run: `npx tsc --noEmit` → aucune erreur.
> Vérifier les signatures `auth.api.banUser`/`unbanUser` (body `{ userId }`) via autocomplétion ; adapter si nécessaire (ex. `banExpiresIn`). Signaler.

- [ ] **Step 3: Commit**
```bash
git add "src/app/api/users/[id]/route.ts"
git commit -m "feat(api): PATCH /api/users/[id] activate/deactivate via better-auth ban"
```

---

## Task 6: Page liste + table

**Files:** Create: `src/app/dashboard/utilisateurs/page.tsx`, `src/app/dashboard/utilisateurs/_components/users-table.tsx`

- [ ] **Step 1: Créer `src/app/dashboard/utilisateurs/page.tsx`**

```tsx
import Link from "next/link";

import { requirePermission, can, getCurrentUser } from "@/lib/authz";
import { getScopedUserWhere, type ScopedUser } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { UsersTable } from "@/app/dashboard/utilisateurs/_components/users-table";

export default async function UsersPage() {
  await requirePermission("read");
  const user = (await getCurrentUser())!;
  const where = await getScopedUserWhere(user as ScopedUser);

  const [users, canCreate] = await Promise.all([
    prisma.user.findMany({
      where: { ...where, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        banned: true,
        profile: { select: { name: true } },
        agencyMembers: { select: { agency: { select: { name: true } } } },
        posMembers: { select: { pointOfSale: { select: { name: true } } } },
      },
    }),
    can("/dashboard/utilisateurs", "create"),
  ]);

  const rows = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    profile: u.profile?.name ?? "—",
    scopes: [
      ...u.agencyMembers.map((m) => m.agency.name),
      ...u.posMembers.map((m) => m.pointOfSale.name),
    ],
    active: u.active && !u.banned,
  }));

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-text">Utilisateurs</h1>
        {canCreate && (
          <Link
            href="/dashboard/utilisateurs/nouveau"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
          >
            Créer un utilisateur
          </Link>
        )}
      </div>
      <UsersTable rows={rows} />
    </div>
  );
}
```

- [ ] **Step 2: Créer `src/app/dashboard/utilisateurs/_components/users-table.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { http } from "@/lib/http";
import { Input } from "@/components/ui/input";

type Row = {
  id: string;
  name: string;
  email: string;
  profile: string;
  scopes: string[];
  active: boolean;
};

export function UsersTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [profile, setProfile] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const profiles = useMemo(() => Array.from(new Set(rows.map((r) => r.profile))), [rows]);
  const filtered = rows.filter(
    (r) =>
      (!q || r.name.toLowerCase().includes(q.toLowerCase()) || r.email.toLowerCase().includes(q.toLowerCase())) &&
      (!profile || r.profile === profile),
  );

  async function toggle(id: string, active: boolean) {
    setBusy(id);
    try {
      await http.patch(`/users/${id}`, { active: !active });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Input placeholder="Rechercher nom ou email…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <select
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
        >
          <option value="">Tous les profils</option>
          {profiles.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-text-2">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Profil</th>
              <th className="px-4 py-3 font-medium">Périmètre</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3 text-text">{r.name}</td>
                <td className="px-4 py-3 text-text-2">{r.email}</td>
                <td className="px-4 py-3 text-text-2">{r.profile}</td>
                <td className="px-4 py-3 text-text-2">{r.scopes.join(", ") || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-medium " +
                      (r.active ? "bg-secondary/15 text-secondary" : "bg-alert/15 text-alert")
                    }
                  >
                    {r.active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => toggle(r.id, r.active)}
                    className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {r.active ? "Désactiver" : "Activer"}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-2">Aucun utilisateur.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Vérifier** — Run: `npx tsc --noEmit` → aucune erreur. Vérifier props `Input`.
- [ ] **Step 4: Commit**
```bash
git add "src/app/dashboard/utilisateurs/page.tsx" "src/app/dashboard/utilisateurs/_components/users-table.tsx"
git commit -m "feat(dashboard): scoped users list with filters and activate/deactivate"
```

---

## Task 7: Page + formulaire de création

**Files:** Create: `src/app/dashboard/utilisateurs/nouveau/page.tsx`, `src/app/dashboard/utilisateurs/nouveau/_components/create-user-form.tsx`

- [ ] **Step 1: Créer `src/app/dashboard/utilisateurs/nouveau/page.tsx`**

```tsx
import { requirePermission, getCurrentUser } from "@/lib/authz";
import { getScopedAgencyIds, getScopedPointOfSaleIds, type ScopedUser } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { CreateUserForm } from "@/app/dashboard/utilisateurs/nouveau/_components/create-user-form";

export default async function NewUserPage() {
  await requirePermission("create");
  const user = (await getCurrentUser())! as ScopedUser;
  const isAdmin = (user.role ?? "user") === "admin";

  const [agencyIds, posIds] = await Promise.all([
    getScopedAgencyIds(user),
    getScopedPointOfSaleIds(user),
  ]);

  const [profiles, agencies, pointsOfSale] = await Promise.all([
    prisma.profile.findMany({
      where: { active: true, ...(isAdmin ? {} : { type: { not: "ADMIN" } }) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.agency.findMany({
      where: agencyIds === null ? {} : { id: { in: agencyIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.pointOfSale.findMany({
      where: posIds === null ? {} : { id: { in: posIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-8">
      <h1 className="mb-6 font-display text-2xl font-semibold text-text">Créer un utilisateur</h1>
      <CreateUserForm profiles={profiles} agencies={agencies} pointsOfSale={pointsOfSale} />
    </div>
  );
}
```

- [ ] **Step 2: Créer `src/app/dashboard/utilisateurs/nouveau/_components/create-user-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { http, type NormalizedError } from "@/lib/http";
import { createUserSchema, type CreateUserInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Opt = { id: string; name: string };

export function CreateUserForm({
  profiles,
  agencies,
  pointsOfSale,
}: {
  profiles: Opt[];
  agencies: Opt[];
  pointsOfSale: Opt[];
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { agencyIds: [], pointOfSaleIds: [] },
  });

  async function onSubmit(values: CreateUserInput) {
    setFormError(null);
    try {
      await http.post("/users", values);
      router.push("/dashboard/utilisateurs");
      router.refresh();
    } catch (e) {
      const err = e as NormalizedError;
      setFormError(err.message);
    }
  }

  const field = "mb-1 block text-sm font-medium text-text";
  const errCls = "mt-1 text-xs text-alert";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={field} htmlFor="firstName">Prénom</label>
          <Input id="firstName" {...register("firstName")} />
          {errors.firstName && <p className={errCls}>{errors.firstName.message}</p>}
        </div>
        <div>
          <label className={field} htmlFor="lastName">Nom</label>
          <Input id="lastName" {...register("lastName")} />
          {errors.lastName && <p className={errCls}>{errors.lastName.message}</p>}
        </div>
      </div>

      <div>
        <label className={field} htmlFor="email">Email</label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className={errCls}>{errors.email.message}</p>}
      </div>

      <div>
        <label className={field} htmlFor="phone">Téléphone</label>
        <Input id="phone" {...register("phone")} />
      </div>

      <div>
        <label className={field} htmlFor="profileId">Profil</label>
        <select
          id="profileId"
          {...register("profileId")}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
        >
          <option value="">Sélectionner…</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {errors.profileId && <p className={errCls}>{errors.profileId.message}</p>}
      </div>

      <fieldset>
        <legend className={field}>Agences</legend>
        <div className="flex flex-col gap-1">
          {agencies.length === 0 && <p className="text-sm text-text-2">Aucune agence disponible.</p>}
          {agencies.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" value={a.id} {...register("agencyIds")} /> {a.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={field}>Points de vente</legend>
        <div className="flex flex-col gap-1">
          {pointsOfSale.length === 0 && <p className="text-sm text-text-2">Aucun point de vente disponible.</p>}
          {pointsOfSale.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" value={p.id} {...register("pointOfSaleIds")} /> {p.name}
            </label>
          ))}
        </div>
      </fieldset>

      {formError && <p className="text-sm text-alert">{formError}</p>}

      <div className="mt-2 flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Création…" : "Créer et inviter"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Vérifier** — Run: `npx tsc --noEmit` → aucune erreur.
> `register("agencyIds")` sur des checkboxes multiples : react-hook-form agrège les valeurs cochées en tableau de strings (le schéma attend `string[]`). Si le type rechigne, garder tel quel (comportement runtime correct) et signaler.

- [ ] **Step 4: Commit**
```bash
git add "src/app/dashboard/utilisateurs/nouveau/page.tsx" "src/app/dashboard/utilisateurs/nouveau/_components/create-user-form.tsx"
git commit -m "feat(dashboard): scoped create-user form (rhf+zod) posting to /api/users"
```

---

## Task 8: Vérification globale

- [ ] **Step 1: Typecheck** — Run: `npx tsc --noEmit` → exit 0.
- [ ] **Step 2: Build** — Run: `npm run build` → réussi ; routes `/dashboard/utilisateurs`, `/dashboard/utilisateurs/nouveau`, `/api/users/[id]` présentes. Warnings « default secret » non bloquants.
- [ ] **Step 3: Lint (informatif)** — `npm run lint`.
- [ ] **Step 4: Commit (si ajustements)**
```bash
git add <fichiers ajustés>
git commit -m "fix(users): resolve build/typecheck issues in Lot 3.3"
```

---

## Task 9: GATED — end-to-end (DB seedée)

- [ ] ADMIN : voit tous les users ; crée un STAFF avec profil + agence ; l'invitation part.
- [ ] STAFF (membre agence A, canCreate) : ne voit que le périmètre de A ; crée un user affecté à A/ses PDV ; tentative ADMIN ou hors périmètre (API forgée) → 403.
- [ ] Désactiver un user → il ne peut plus se connecter ; réactiver → OK.
- [ ] Recherche/filtre profil fonctionnels.

---

## Self-Review (effectuée)

**Couverture spec :** scope.ts (§3) → T1 ; can (§4) → T2 ; schémas (§5,6) → T3 ; POST étendu (§5) → T4 ; PATCH ban (§6) → T5 ; liste (§7) → T6 ; formulaire (§8) → T7 ; vérif (§10) → T8/T9. ✅

**Placeholders :** aucun ; code complet.

**Cohérence des types :** `ScopedUser` défini en T1, importé en T4/T6/T7 ; `can` (T2) consommé en T4/T5/T6 ; `createUserSchema`/`toggleUserSchema` (T3) consommés en T4/T5/T7 ; enveloppe d'erreur (`ApiError`/`toErrorResponse`) réutilisée ; `http`/`NormalizedError` (Lot 2) consommés en T6/T7 ; relations Prisma `agencyMembers`/`posMembers`/`profile` confirmées au schéma.

**Risques (signalés) :** forme retour `createUser`, signatures `banUser`/`unbanUser`, agrégation `register` sur checkboxes multiples → fallbacks/notes dans les steps.
