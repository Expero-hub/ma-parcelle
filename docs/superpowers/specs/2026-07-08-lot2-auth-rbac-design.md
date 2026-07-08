# Lot 2 — Auth & RBAC : configuration Better Auth, invitation, pages d'authentification

**Date :** 2026-07-08
**Statut :** Design (en attente de relecture utilisateur avant plan)
**Projet :** `ma_parcelle` — Next.js 16 (App Router)
**Dépend de :** Lot 1 (fondations backend) — schéma Prisma, `src/lib/prisma.ts`, `src/lib/auth.ts` minimal.

---

## 1. Objectif & périmètre

Rendre l'application **authentifiable** : configuration complète de Better Auth, flux
d'onboarding par **invitation email** (l'admin crée un compte, l'utilisateur définit son mot de
passe via un lien), pages **connexion / mot de passe oublié / nouveau mot de passe**, et un
**header conscient de la session**. Le tout en **architecture API-first** (aucune server action)
pour permettre une future app mobile.

### Ce que le Lot 2 NE fait PAS (→ Lot 3)

- Les deux dashboards *collapsibles* (dashboard admin + espace client).
- L'**UI admin de création d'utilisateur** (elle appellera le `POST /api/users` construit ici).
- Les guards de permission par menu (accès dashboard) et le rendu du menu latéral depuis la DB.
- Le branchement du front public sur la DB (le mock `src/lib/parcelles.ts` reste).

---

## 2. Décisions (validées)

1. **API-first, aucune server action.** Web et futur mobile consomment les mêmes endpoints REST.
2. **Inscription publique désactivée** (`disableSignUp`). Seuls les admins créent des comptes.
3. **Onboarding par invitation** : admin crée le compte → email avec lien → l'utilisateur définit son mot de passe. Aucun mot de passe n'est envoyé par email.
4. **Un seul mécanisme, un seul email neutre** : invitation et « mot de passe oublié » utilisent le **même token de reset** Better Auth et le **même template** neutre (« Définissez votre mot de passe »).
5. **Pages mot de passe fusionnées** : `/nouveau-mot-de-passe` (token → nouveau mdp) sert à la fois à l'invitation et au reset.
6. **Routes FR** : `/connexion`, `/mot-de-passe-oublie`, `/nouveau-mot-de-passe` ; stubs `/mon-espace`, `/dashboard`.
7. **Header session-aware** : Connexion / Mon espace / Dashboard selon le rôle + menu utilisateur (déconnexion).
8. **Pas de vérification email obligatoire** pour se connecter (`requireEmailVerification: false`) — définir son mot de passe via le lien suffit.

---

## 3. Architecture

```
Navigateur (web)                          Futur mobile
   │  authClient (Better Auth)               │  (mêmes endpoints REST)
   │  axios http.ts (endpoints custom)       │
   ▼                                         ▼
Next.js Route Handlers
   ├── /api/auth/[...all]   → Better Auth (signIn, signOut, session, reset, admin.*)
   └── /api/users (POST)    → custom : admin crée un utilisateur + envoie l'invitation
        │
        ├── auth.api.createUser        (plugin admin)
        ├── auth.api.requestPasswordReset  → sendResetPassword hook
        └── Resend (email d'invitation/reset, template neutre)
   ▼
Prisma → Supabase Postgres
```

- **Better Auth** gère toute la mécanique d'auth via ses propres endpoints REST → réutilisables par le mobile.
- **Un seul endpoint custom** au Lot 2 : `POST /api/users`.
- Le **client web** n'utilise jamais de server action : `authClient` (Better Auth) pour l'auth, `axios` (`http.ts`) pour `/api/users`.

---

## 4. Configuration Better Auth (`src/lib/auth.ts`, enrichie)

```ts
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,               // seuls les admins créent des comptes
    requireEmailVerification: false,
    sendResetPassword: async ({ user, token }) => {
      await sendPasswordEmail({
        to: user.email,
        name: user.name,
        link: `${process.env.BETTER_AUTH_URL}/nouveau-mot-de-passe?token=${token}`,
      });
    },
  },
  user: { additionalFields: { /* Lot 1 : firstName, lastName, phone, address, isValidated, active, profileId, companyId, createdById */ } },
  plugins: [admin()],
});
```

> `sendResetPassword` construit le lien vers **notre** page `/nouveau-mot-de-passe` en y injectant le token. Un seul template d'email (`sendPasswordEmail`) sert invitation et reset.

---

## 5. Flux d'invitation (`POST /api/users`)

**Auth requise : admin.** L'endpoint reçoit les headers de la requête pour que Better Auth vérifie la session admin.

1. Valider le corps (zod `createUserSchema` : `email`, `firstName`, `lastName`, `phone?`, `profileId`, `companyId?`).
2. `auth.api.createUser({ body: { email, name, password: <aléatoire fort jamais révélé>, role, data: { profileId, firstName, lastName, phone, companyId, createdById } }, headers })`.
3. `auth.api.requestPasswordReset({ body: { email, redirectTo: "/nouveau-mot-de-passe" } })` → déclenche `sendResetPassword` → email d'invitation neutre.
4. Réponse : `{ data: { id, email } }` (jamais de mot de passe).

**Erreurs gérées** : non authentifié (401), non admin (403), email déjà pris (409), validation (422), erreur interne (500) — via l'enveloppe standard (§8).

> Note : le mot de passe temporaire aléatoire n'est jamais transmis ; il est immédiatement remplacé par celui que l'utilisateur choisit via le lien.

---

## 6. Endpoints API

| Endpoint | Méthode | Auth | Rôle |
|---|---|---|---|
| `/api/auth/[...all]` | GET/POST | Better Auth | signIn, signOut, session, requestPasswordReset, resetPassword, admin.* |
| `/api/users` | POST | Admin | Créer un utilisateur + envoyer l'invitation |

Le handler Better Auth : `export const { GET, POST } = toNextJsHandler(auth)`.

---

## 7. Client web

- **`src/lib/auth-client.ts`** : `createAuthClient({ plugins: [adminClient(), inferAdditionalFields<typeof auth>()] })` (baseURL = origine courante). Expose `signIn`, `signOut`, `useSession`, `requestPasswordReset`, `resetPassword`.
- **`src/lib/http.ts`** : instance `axios` (baseURL relative `/api`, `withCredentials`, `Content-Type` JSON) + intercepteur de réponse qui normalise les erreurs en `{ code, message, fieldErrors? }` et gère réseau/timeout.
- **SWR** : hooks pour les lectures custom (aucune au Lot 2 côté public ; l'infra est posée pour le Lot 3).

---

## 8. Validation & enveloppe d'erreur

- **`src/lib/validations/auth.ts`** : `loginSchema`, `forgotPasswordSchema`, `newPasswordSchema` (règles de robustesse : longueur min, confirmation), `createUserSchema`. Réutilisés **client** (rhf resolver) **et serveur** (route handler).
- **`src/lib/api/`** :
  - `errors.ts` — enveloppe standard `{ error: { code, message, fieldErrors? } }` + helpers (`ApiError`, mapping erreurs Prisma connues P2002/P2025, erreurs Better Auth).
  - `handler.ts` — wrapper `route(handler)` : parse/validation zod, try/catch centralisé → enveloppe standard, codes HTTP corrects.

Format succès : `{ data: ... }`. Format erreur : `{ error: { code, message, fieldErrors? } }`.

---

## 9. Email (Resend)

- **`src/lib/email/resend.ts`** : client Resend (clé `RESEND_API_KEY`).
- **`src/lib/email/templates.ts`** : `sendPasswordEmail({ to, name, link })` — **un seul template neutre** FR, marque « Ma Parcelle », bouton « Définir mon mot de passe », mention d'expiration du lien. Expéditeur `EMAIL_FROM`.

---

## 10. Pages (route group `app/(auth)/`)

Layout auth partagé : carte centrée, branding (logo borne), mode clair/sombre, responsive, design system (tokens `globals.css`, composants shadcn). Formulaires **react-hook-form + zod**, états de chargement/erreur, focus accessible.

| Route | Contenu | Action |
|---|---|---|
| `/connexion` | Email + mot de passe | `authClient.signIn.email` → redirection par rôle (client → `/mon-espace`, admin/staff → `/dashboard`) ; lien « mot de passe oublié » |
| `/mot-de-passe-oublie` | Email | `authClient.requestPasswordReset` → écran de confirmation (email envoyé) |
| `/nouveau-mot-de-passe` | Nouveau mdp + confirmation (lit `token` de l'URL) | `authClient.resetPassword({ token, newPassword })` → succès → `/connexion`. Copie contextuelle via `?invite=1` (facultatif) |

Redirection : si déjà connecté, `/connexion` renvoie vers l'espace correspondant.

## 11. Header session-aware

[src/components/shared/site-header.tsx](src/components/shared/site-header.tsx) utilise `authClient.useSession()` :

| État | Affichage |
|---|---|
| Non connecté | Bouton « Connexion » → `/connexion` |
| Client (profil CLIENT) | « Mon espace » → `/mon-espace` + menu utilisateur (initiales, déconnexion) |
| Admin / STAFF | « Dashboard » → `/dashboard` + menu utilisateur |

Pages **stub** `app/mon-espace/page.tsx` et `app/dashboard/page.tsx` (« à venir », protégées : redirigent vers `/connexion` si non authentifié).

---

## 12. Structure des fichiers

**Créés :**
- `src/app/api/auth/[...all]/route.ts` — handler Better Auth
- `src/app/api/users/route.ts` — POST création utilisateur + invitation
- `src/lib/auth-client.ts` — client Better Auth
- `src/lib/http.ts` — instance axios sécurisée
- `src/lib/validations/auth.ts` — schémas zod
- `src/lib/api/errors.ts`, `src/lib/api/handler.ts` — enveloppe + wrapper de route
- `src/lib/email/resend.ts`, `src/lib/email/templates.ts` — Resend + template
- `src/app/(auth)/layout.tsx` + `connexion/page.tsx` + `mot-de-passe-oublie/page.tsx` + `nouveau-mot-de-passe/page.tsx`
- `src/app/mon-espace/page.tsx`, `src/app/dashboard/page.tsx` — stubs protégés
- (si besoin) `src/components/shared/user-menu.tsx`

**Modifiés :**
- `src/lib/auth.ts` — config complète
- `src/components/shared/site-header.tsx` — états de session
- `.env.example` — rien de nouveau attendu (variables déjà présentes au Lot 1)

---

## 13. Vérification & critères de succès

**Réalisable/vérifiable sans credentials :**
1. `npx tsc --noEmit` sans erreur sur tous les nouveaux fichiers.
2. `npm run build` réussit (pages + routes compilent).
3. `npx prisma validate` toujours vert (aucun changement de schéma attendu).
4. Revue : validation zod présente sur chaque entrée ; enveloppe d'erreur homogène.

**Vérifiable seulement avec Supabase + Resend (après migration T16) :**
5. Un admin (créé au seed) se connecte via `/connexion`.
6. `POST /api/users` crée un utilisateur et envoie l'email d'invitation (Resend).
7. Le lien mène à `/nouveau-mot-de-passe` ; l'utilisateur définit son mdp puis se connecte.
8. « Mot de passe oublié » envoie l'email et permet la réinitialisation.
9. Le header reflète l'état de session et le rôle ; la déconnexion fonctionne.

> Le Lot 2 sera **construit et type-checké** maintenant ; les critères 5–9 seront validés dès que les credentials seront disponibles.

---

## 14. Risques

- **Intégration non testable hors-ligne** : les parcours réels (login, email, sessions) ne seront confirmés qu'avec les credentials. Mitigation : build + typecheck stricts, validation double, code aligné sur la doc officielle Better Auth.
- **Compatibilité version** : `@better-auth/cli` était en 1.4.x au Lot 1 (non requis ici) ; on n'utilise que la lib `better-auth@1.6.x`. Vérifier les signatures `createUser`/`requestPasswordReset` contre la doc 1.6 au moment de coder.
