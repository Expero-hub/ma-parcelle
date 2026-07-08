# Lot 2 — Auth & RBAC : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre l'app authentifiable — config Better Auth complète, endpoint API d'invitation, pages connexion / mot-de-passe-oublié / nouveau-mot-de-passe, header conscient de la session — en architecture API-first (aucune server action).

**Architecture:** Better Auth monté sur `/api/auth/[...all]` (consommable web + futur mobile) ; un endpoint custom `POST /api/users` (admin) crée un utilisateur puis déclenche un email d'invitation neutre (Resend) via le token de reset. Le client web utilise `authClient` (Better Auth) pour l'auth et `axios` (`http.ts`) pour les endpoints custom. Validation zod partagée client/serveur, enveloppe d'erreur standard.

**Tech Stack:** Next.js 16 App Router, Better Auth 1.6, Prisma 7, Resend, react-hook-form + zod, axios, Tailwind v4 + shadcn/ui.

**Référence spec :** `docs/superpowers/specs/2026-07-08-lot2-auth-rbac-design.md`

**Vérification :** pas de framework de test dans ce projet (cohérent avec le Lot 1). Les portes de vérification sont `npx tsc --noEmit` et `npm run build`. Le end-to-end réel (login, email, sessions) nécessite les credentials Supabase + Resend (→ après migration T16 du Lot 1).

**Convention de commit :** `git add <chemins précis>` uniquement — le dépôt contient du WIP non lié. Jamais `git add -A`/`.`.

**Rappel AGENTS.md :** avant tout travail Next.js, l'implémenteur DOIT lire la doc pertinente dans `node_modules/next/dist/docs/` (route handlers, route groups, redirect). Les APIs Better Auth de ce plan sont issues de la doc officielle 1.6 ; vérifier les signatures au moment de coder.

---

## File Structure

**Créés :**
- `src/lib/email/resend.ts` — client Resend
- `src/lib/email/templates.ts` — `sendPasswordEmail({ to, name, link })`
- `src/lib/auth-client.ts` — client Better Auth (React)
- `src/lib/api/errors.ts` — `ApiError`, enveloppe + mapping erreurs
- `src/lib/api/handler.ts` — wrapper `route()` (try/catch → enveloppe)
- `src/lib/validations/auth.ts` — schémas zod
- `src/lib/http.ts` — instance axios
- `src/app/api/auth/[...all]/route.ts` — handler Better Auth
- `src/app/api/users/route.ts` — POST création utilisateur + invitation
- `src/app/(auth)/layout.tsx` — layout auth (carte centrée)
- `src/app/(auth)/connexion/page.tsx`
- `src/app/(auth)/mot-de-passe-oublie/page.tsx`
- `src/app/(auth)/nouveau-mot-de-passe/page.tsx`
- `src/components/shared/user-menu.tsx` — menu utilisateur (déconnexion)
- `src/app/mon-espace/page.tsx`, `src/app/dashboard/page.tsx` — stubs protégés

**Modifiés :**
- `src/lib/auth.ts` — config complète
- `src/components/shared/site-header.tsx` — états de session

---

## Task 1: Module email (Resend + template neutre)

**Files:**
- Create: `src/lib/email/resend.ts`, `src/lib/email/templates.ts`

- [ ] **Step 1: Créer `src/lib/email/resend.ts`**

```ts
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);
```

- [ ] **Step 2: Créer `src/lib/email/templates.ts`**

```ts
import { resend } from "@/lib/email/resend";

/**
 * Email neutre servant à la fois à l'invitation (1re définition du mot de passe)
 * et à la réinitialisation. `link` mène vers /nouveau-mot-de-passe?token=...
 */
export async function sendPasswordEmail(params: { to: string; name: string; link: string }) {
  const { to, name, link } = params;
  return resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: "Ma Parcelle — Définissez votre mot de passe",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;color:#22201D">
        <h1 style="font-size:20px;color:#B1502F">Ma Parcelle</h1>
        <p>Bonjour ${name},</p>
        <p>Pour accéder à votre compte, définissez votre mot de passe en cliquant sur le bouton ci-dessous.</p>
        <p style="text-align:center;margin:28px 0">
          <a href="${link}" style="background:#B1502F;color:#FFFDF9;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Définir mon mot de passe</a>
        </p>
        <p style="font-size:13px;color:#5A554C">Ce lien expire après un délai limité. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      </div>
    `,
  });
}
```

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur sur `src/lib/email/*`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/email/resend.ts src/lib/email/templates.ts
git commit -m "feat(email): resend client and neutral password email template"
```

---

## Task 2: Config Better Auth complète + route handler + client

**Files:**
- Modify: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...all]/route.ts`, `src/lib/auth-client.ts`

- [ ] **Step 1: Remplacer `src/lib/auth.ts`**

```ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";

import { prisma } from "@/lib/prisma";
import { sendPasswordEmail } from "@/lib/email/templates";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, token }) => {
      await sendPasswordEmail({
        to: user.email,
        name: user.name,
        link: `${process.env.BETTER_AUTH_URL}/nouveau-mot-de-passe?token=${token}`,
      });
    },
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

- [ ] **Step 2: Créer `src/app/api/auth/[...all]/route.ts`**

```ts
import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 3: Créer `src/lib/auth-client.ts`**

```ts
import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";

import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [adminClient(), inferAdditionalFields<typeof auth>()],
});

export const { signIn, signOut, useSession, requestPasswordReset, resetPassword } = authClient;
```

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur sur `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/app/api/auth/[...all]/route.ts`.
> Si `better-auth/client/plugins` n'exporte pas `inferAdditionalFields`, l'importer depuis `better-auth/client/plugins` reste la voie officielle ; en cas d'échec de type, retirer `inferAdditionalFields<typeof auth>()` et conserver `adminClient()` (les champs additionnels resteront accessibles en `any`). Documenter le choix.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/[...all]/route.ts src/lib/auth-client.ts
git commit -m "feat(auth): full better-auth config, next.js handler, react client"
```

---

## Task 3: Fondations API — enveloppe d'erreur, wrapper de route, schémas zod

**Files:**
- Create: `src/lib/api/errors.ts`, `src/lib/api/handler.ts`, `src/lib/validations/auth.ts`

- [ ] **Step 1: Créer `src/lib/api/errors.ts`**

```ts
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";

/** Erreur applicative avec code HTTP + code métier. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

type ErrorBody = { error: { code: string; message: string; fieldErrors?: Record<string, string> } };

/** Convertit n'importe quelle erreur en réponse JSON normalisée. */
export function toErrorResponse(err: unknown): NextResponse<ErrorBody> {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } },
      { status: err.status },
    );
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const path = issue.path.join(".");
      if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Données invalides.", fieldErrors } },
      { status: 422 },
    );
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Cette ressource existe déjà." } },
        { status: 409 },
      );
    }
    if (err.code === "P2025") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Ressource introuvable." } },
        { status: 404 },
      );
    }
  }

  console.error("[api] Unhandled error:", err);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Une erreur interne est survenue." } },
    { status: 500 },
  );
}
```

- [ ] **Step 2: Créer `src/lib/api/handler.ts`**

```ts
import type { NextRequest } from "next/server";

import { toErrorResponse } from "@/lib/api/errors";

/** Enrobe un handler de route : try/catch centralisé → enveloppe d'erreur standard. */
export function route(fn: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest): Promise<Response> => {
    try {
      return await fn(req);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
```

- [ ] **Step 3: Créer `src/lib/validations/auth.ts`**

```ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide."),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, "8 caractères minimum."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirm"],
  });
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

export const createUserSchema = z.object({
  email: z.string().email("Email invalide."),
  firstName: z.string().min(1, "Prénom requis."),
  lastName: z.string().min(1, "Nom requis."),
  phone: z.string().optional(),
  profileId: z.string().min(1, "Profil requis."),
  companyId: z.string().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;
```

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur sur `src/lib/api/*` ni `src/lib/validations/auth.ts`.
> Note : `Prisma` est importé depuis `@/generated/prisma/client` (generator Prisma 7). Si le namespace `Prisma` n'y est pas exporté, utiliser `import { Prisma } from "@/generated/prisma/client"` reste correct pour Prisma 7 ; sinon fallback `Prisma` depuis `@/generated/prisma/internal/prismaNamespace` — vérifier l'export réel via l'autocomplétion.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/errors.ts src/lib/api/handler.ts src/lib/validations/auth.ts
git commit -m "feat(api): error envelope, route wrapper, zod auth schemas"
```

---

## Task 4: Helper axios `http.ts`

**Files:**
- Create: `src/lib/http.ts`

- [ ] **Step 1: Créer `src/lib/http.ts`**

```ts
import axios, { AxiosError } from "axios";

/** Erreur normalisée exposée aux appelants. */
export type NormalizedError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  status?: number;
};

export const http = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ error?: NormalizedError }>) => {
    if (error.response) {
      const body = error.response.data?.error;
      const normalized: NormalizedError = {
        code: body?.code ?? "HTTP_ERROR",
        message: body?.message ?? "Une erreur est survenue.",
        fieldErrors: body?.fieldErrors,
        status: error.response.status,
      };
      return Promise.reject(normalized);
    }
    const normalized: NormalizedError = {
      code: error.code === "ECONNABORTED" ? "TIMEOUT" : "NETWORK_ERROR",
      message: "Impossible de joindre le serveur. Vérifiez votre connexion.",
    };
    return Promise.reject(normalized);
  },
);
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur sur `src/lib/http.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/http.ts
git commit -m "feat(api): secure axios helper with normalized errors"
```

---

## Task 5: Endpoint `POST /api/users` (création + invitation)

**Files:**
- Create: `src/app/api/users/route.ts`

- [ ] **Step 1: Créer `src/app/api/users/route.ts`**

```ts
import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { createUserSchema } from "@/lib/validations/auth";

/** Mot de passe temporaire aléatoire fort, jamais transmis (l'utilisateur le remplace via le lien). */
function randomPassword(): string {
  return randomBytes(24).toString("base64url") + "aA1!";
}

export const POST = route(async (req: NextRequest) => {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
  if (session.user.role !== "admin") throw new ApiError(403, "FORBIDDEN", "Réservé aux administrateurs.");

  const body = createUserSchema.parse(await req.json());

  const profile = await prisma.profile.findUnique({
    where: { id: body.profileId },
    select: { type: true },
  });
  if (!profile) {
    throw new ApiError(422, "INVALID_PROFILE", "Profil introuvable.", { profileId: "Profil invalide." });
  }
  const role = profile.type === "ADMIN" ? "admin" : profile.type === "STAFF" ? "staff" : "user";

  const created = await auth.api.createUser({
    body: {
      email: body.email,
      password: randomPassword(),
      name: `${body.firstName} ${body.lastName}`.trim(),
      role,
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        profileId: body.profileId,
        companyId: body.companyId,
        createdById: session.user.id,
      },
    },
    headers: h,
  });

  // Déclenche l'email d'invitation (template neutre) via le token de reset.
  await auth.api.requestPasswordReset({
    body: { email: body.email, redirectTo: "/nouveau-mot-de-passe" },
  });

  return Response.json({ data: { id: created.user.id, email: created.user.email } }, { status: 201 });
});
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur sur `src/app/api/users/route.ts`.
> Si le type de retour de `auth.api.createUser` n'expose pas `.user`, adapter à la forme réelle (`created.user` ou `created`). Vérifier via l'autocomplétion.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/users/route.ts
git commit -m "feat(api): POST /api/users — admin creates user and sends invitation"
```

---

## Task 6: Layout auth + page `/connexion`

**Files:**
- Create: `src/app/(auth)/layout.tsx`, `src/app/(auth)/connexion/page.tsx`

- [ ] **Step 1: Lire la doc Next.js route groups**

Run: `cat node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`
Expected: comprendre que `(auth)` ne modifie pas l'URL (`/connexion` reste `/connexion`).

- [ ] **Step 2: Créer `src/app/(auth)/layout.tsx`**

```tsx
import Link from "next/link";

import { BrandLogo } from "@/components/shared/brand-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <BrandLogo />
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-[var(--shadow)]">
          {children}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Créer `src/app/(auth)/connexion/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { signIn, authClient } from "@/lib/auth-client";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ConnexionPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    const { error } = await signIn.email({ email: values.email, password: values.password });
    if (error) {
      setFormError("Email ou mot de passe incorrect.");
      return;
    }
    const session = await authClient.getSession();
    const role = session.data?.user.role;
    router.push(role === "admin" || role === "staff" ? "/dashboard" : "/mon-espace");
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-text">Connexion</h1>
      <p className="mb-6 text-sm text-text-2">Accédez à votre espace Ma Parcelle.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-text">Email</label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && <p className="mt-1 text-xs text-alert">{errors.email.message}</p>}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-text">Mot de passe</label>
            <Link href="/mot-de-passe-oublie" className="text-xs text-primary hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
          {errors.password && <p className="mt-1 text-xs text-alert">{errors.password.message}</p>}
        </div>

        {formError && <p className="text-sm text-alert">{formError}</p>}

        <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur. Vérifier que `Button`/`Input` acceptent les props utilisées (voir `src/components/ui/`).
> Si `signIn.email` renvoie une forme différente de `{ error }`, adapter. Si `authClient.getSession()` n'a pas `.data`, utiliser la forme réelle retournée.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/layout.tsx" "src/app/(auth)/connexion/page.tsx"
git commit -m "feat(auth-ui): auth layout and login page"
```

---

## Task 7: Pages `/mot-de-passe-oublie` et `/nouveau-mot-de-passe`

**Files:**
- Create: `src/app/(auth)/mot-de-passe-oublie/page.tsx`, `src/app/(auth)/nouveau-mot-de-passe/page.tsx`

- [ ] **Step 1: Créer `src/app/(auth)/mot-de-passe-oublie/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { requestPasswordReset } from "@/lib/auth-client";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MotDePasseOubliePage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordInput) {
    await requestPasswordReset({ email: values.email, redirectTo: "/nouveau-mot-de-passe" });
    // Toujours afficher le succès (ne pas révéler si l'email existe).
    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <h1 className="mb-2 font-display text-2xl font-semibold text-text">Email envoyé</h1>
        <p className="text-sm text-text-2">
          Si un compte existe pour cette adresse, un lien de définition du mot de passe vient d'être envoyé.
        </p>
        <Link href="/connexion" className="mt-6 inline-block text-sm text-primary hover:underline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-text">Mot de passe oublié</h1>
      <p className="mb-6 text-sm text-text-2">Saisissez votre email pour recevoir un lien.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-text">Email</label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && <p className="mt-1 text-xs text-alert">{errors.email.message}</p>}
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? "Envoi…" : "Envoyer le lien"}
        </Button>
        <Link href="/connexion" className="text-center text-sm text-primary hover:underline">
          Retour à la connexion
        </Link>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Créer `src/app/(auth)/nouveau-mot-de-passe/page.tsx`**

```tsx
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { resetPassword } from "@/lib/auth-client";
import { newPasswordSchema, type NewPasswordInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function NouveauMotDePasseForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const isInvite = params.get("invite") === "1";
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordInput>({ resolver: zodResolver(newPasswordSchema) });

  if (!token) {
    return (
      <div>
        <h1 className="mb-2 font-display text-2xl font-semibold text-text">Lien invalide</h1>
        <p className="text-sm text-text-2">Ce lien est invalide ou a expiré. Demandez-en un nouveau.</p>
        <Link href="/mot-de-passe-oublie" className="mt-6 inline-block text-sm text-primary hover:underline">
          Renvoyer un lien
        </Link>
      </div>
    );
  }

  async function onSubmit(values: NewPasswordInput) {
    setFormError(null);
    const { error } = await resetPassword({ newPassword: values.password, token: token! });
    if (error) {
      setFormError("Le lien a expiré ou est invalide. Demandez-en un nouveau.");
      return;
    }
    router.push("/connexion");
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-text">
        {isInvite ? "Bienvenue" : "Nouveau mot de passe"}
      </h1>
      <p className="mb-6 text-sm text-text-2">
        {isInvite ? "Définissez votre mot de passe pour activer votre compte." : "Choisissez un nouveau mot de passe."}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-text">Mot de passe</label>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
          {errors.password && <p className="mt-1 text-xs text-alert">{errors.password.message}</p>}
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-text">Confirmer</label>
          <Input id="confirm" type="password" autoComplete="new-password" {...register("confirm")} />
          {errors.confirm && <p className="mt-1 text-xs text-alert">{errors.confirm.message}</p>}
        </div>

        {formError && <p className="text-sm text-alert">{formError}</p>}

        <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? "Validation…" : "Valider"}
        </Button>
      </form>
    </div>
  );
}

export default function NouveauMotDePassePage() {
  return (
    <Suspense fallback={null}>
      <NouveauMotDePasseForm />
    </Suspense>
  );
}
```

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur. `useSearchParams` doit être sous `<Suspense>` (déjà fait).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)/mot-de-passe-oublie/page.tsx" "src/app/(auth)/nouveau-mot-de-passe/page.tsx"
git commit -m "feat(auth-ui): forgot-password and set-new-password pages"
```

---

## Task 8: Header session-aware + menu utilisateur + pages stub

**Files:**
- Create: `src/components/shared/user-menu.tsx`, `src/app/mon-espace/page.tsx`, `src/app/dashboard/page.tsx`
- Modify: `src/components/shared/site-header.tsx`

- [ ] **Step 1: Créer `src/components/shared/user-menu.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";

import { signOut } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function UserMenu({ name }: { name: string }) {
  const router = useRouter();

  async function onSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu utilisateur"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary"
      >
        {initials(name)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onSignOut}>Se déconnecter</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Modifier `src/components/shared/site-header.tsx`**

Remplacer le bloc du lien « Connexion » (desktop) par une logique de session. Ajouter en haut du fichier :
```tsx
import { useSession } from "@/lib/auth-client";
import { UserMenu } from "@/components/shared/user-menu";
```

Dans le composant `SiteHeader`, ajouter après `const [open, setOpen] = useState(false);` :
```tsx
  const { data: session } = useSession();
  const role = session?.user.role;
  const espaceHref = role === "admin" || role === "staff" ? "/dashboard" : "/mon-espace";
  const espaceLabel = role === "admin" || role === "staff" ? "Dashboard" : "Mon espace";
```

Remplacer le lien « Connexion » desktop (celui dans `<div className="flex items-center gap-3">`) par :
```tsx
          {session ? (
            <>
              <Link
                href={espaceHref}
                className="hidden px-[14px] py-[10px] font-sans text-sm font-semibold text-text transition-colors hover:text-primary md:inline"
              >
                {espaceLabel}
              </Link>
              <UserMenu name={session.user.name} />
            </>
          ) : (
            <Link
              href="/connexion"
              className="hidden px-[14px] py-[10px] font-sans text-sm font-semibold text-text transition-colors hover:text-primary md:inline"
            >
              Connexion
            </Link>
          )}
```

Dans le menu mobile (le bloc `{open && (...)}`), remplacer le lien « Connexion » mobile par :
```tsx
            <Link
              href={session ? espaceHref : "/connexion"}
              onClick={() => setOpen(false)}
              className="mt-[14px] rounded-[10px] bg-primary p-[14px] text-center font-sans text-[15px] font-semibold text-on-primary"
            >
              {session ? espaceLabel : "Connexion"}
            </Link>
```

> Ne pas toucher au reste du header (nav, logo, ModeToggle, bouton burger).

- [ ] **Step 3: Créer `src/app/mon-espace/page.tsx`**

```tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function MonEspacePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion");

  return (
    <main className="mx-auto max-w-[900px] px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-text">Mon espace</h1>
      <p className="mt-2 text-text-2">Bonjour {session.user.name} — cet espace arrive bientôt.</p>
    </main>
  );
}
```

- [ ] **Step 4: Créer `src/app/dashboard/page.tsx`**

```tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion");
  if (session.user.role !== "admin" && session.user.role !== "staff") redirect("/mon-espace");

  return (
    <main className="mx-auto max-w-[900px] px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-text">Dashboard</h1>
      <p className="mt-2 text-text-2">Bonjour {session.user.name} — le tableau de bord arrive au Lot 3.</p>
    </main>
  );
}
```

- [ ] **Step 5: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur. Vérifier que `DropdownMenu*` existent bien dans `src/components/ui/dropdown-menu.tsx` avec les sous-composants utilisés.

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/user-menu.tsx src/components/shared/site-header.tsx src/app/mon-espace/page.tsx src/app/dashboard/page.tsx
git commit -m "feat(auth-ui): session-aware header, user menu, protected stub pages"
```

---

## Task 9: Vérification globale (build + typecheck)

**Files:** aucun (vérification), sauf ajustements éventuels.

- [ ] **Step 1: Typecheck complet**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 2: Build Next.js**

Run: `npm run build`
Expected: build réussi. Les routes `/connexion`, `/mot-de-passe-oublie`, `/nouveau-mot-de-passe`, `/mon-espace`, `/dashboard`, `/api/auth/[...all]`, `/api/users` apparaissent dans la sortie.
> Le build peut nécessiter des variables d'env présentes. Si une page/route échoue faute d'env au build (ex. instanciation Resend/Better Auth au top-level), s'assurer que ces instanciations ne lèvent pas sans clé (Resend/BetterAuth tolèrent une clé absente à la construction). Si un échec survient, décrire l'erreur exacte.

- [ ] **Step 3: Lint (informatif)**

Run: `npm run lint`
Expected: pas de nouvelle erreur bloquante sur les fichiers créés (corriger les erreurs, ignorer les warnings préexistants du WIP).

- [ ] **Step 4: Commit (si ajustements)**

```bash
git add <fichiers ajustés>
git commit -m "fix(auth): resolve build/typecheck issues in Lot 2"
```

---

## Task 10: GATED — vérification end-to-end (nécessite Supabase + Resend)

> À exécuter uniquement après la migration T16 du Lot 1 et avec `.env` renseigné (DB + Resend).

- [ ] **Step 1: Démarrer** — `npm run dev`.
- [ ] **Step 2: Connexion admin** — se connecter sur `/connexion` avec l'admin du seed → redirection `/dashboard`.
- [ ] **Step 3: Créer un utilisateur** — appeler `POST /api/users` (via un client REST/script) authentifié en admin → 201 + email d'invitation reçu (Resend).
- [ ] **Step 4: Onboarding** — ouvrir le lien de l'email → `/nouveau-mot-de-passe` → définir le mdp → connexion réussie ; un CLIENT atterrit sur `/mon-espace`.
- [ ] **Step 5: Mot de passe oublié** — `/mot-de-passe-oublie` → email → reset → reconnexion.
- [ ] **Step 6: Header & déconnexion** — le header affiche le bon libellé selon le rôle ; la déconnexion renvoie à l'accueil.

---

## Self-Review (effectuée)

**1. Couverture du spec :**
- API-first / Better Auth handler (§3, §6) → Tasks 2 ✅
- Config Better Auth + disableSignUp + sendResetPassword (§4) → Task 2 ✅
- Flux invitation `POST /api/users` (§5) → Task 5 ✅
- Client authClient + http.ts (§7) → Tasks 2, 4 ✅
- Validation + enveloppe d'erreur (§8) → Task 3 ✅
- Email Resend template neutre (§9) → Task 1 ✅
- Pages connexion / oubli / nouveau-mdp (§10) → Tasks 6, 7 ✅
- Header session-aware + stubs (§11) → Task 8 ✅
- Vérification (§13) → Task 9 (offline) + Task 10 (gated) ✅

**2. Placeholders :** aucun TODO/TBD ; code complet fourni pour chaque fichier.

**3. Cohérence des types :** `role` ("admin"/"staff"/"user") posé en Task 5, lu identiquement en Tasks 6 (redirection), 8 (header + guards). Enveloppe d'erreur `{ error: { code, message, fieldErrors? } }` produite (Task 3) et consommée (Task 4). `newPasswordSchema` champ `confirm` cohérent entre schéma (Task 3) et formulaire (Task 7). Routes (`/connexion`, `/mot-de-passe-oublie`, `/nouveau-mot-de-passe`, `/mon-espace`, `/dashboard`) identiques entre liens, redirections et `sendResetPassword`.

**Risques connus (signalés dans les steps concernés) :** signatures exactes Better Auth (`signIn.email`, `getSession`, `createUser` retour, `inferAdditionalFields`) à confirmer par autocomplétion au moment de coder ; import du namespace `Prisma` depuis le client généré Prisma 7.
