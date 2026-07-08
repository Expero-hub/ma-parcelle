# Lot 3.3 — Gestion des utilisateurs (admin) + scoping

**Date :** 2026-07-08
**Statut :** Design (en attente de relecture utilisateur avant plan)
**Projet :** `ma_parcelle` — Next.js 16 (App Router)
**Dépend de :** Lot 3.1 (authz, `getUserMenus`, cache) + 3.2 (coquille dashboard) + Lot 2 (`POST /api/users`, invitation) + Lot 1 (AgencyMember, PointOfSaleMember, ProfilePermission).

---

## 1. Objectif & périmètre

Première vraie feature métier du dashboard : **lister, créer et activer/désactiver** des utilisateurs,
en respectant le **scoping hiérarchique** (un STAFF ne voit/gère que son périmètre d'agences et de
points de vente) et **sans escalade de privilèges** (un STAFF ne crée jamais d'ADMIN, ni hors de son
périmètre).

### Hors périmètre (→ lots ultérieurs)

- Édition complète d'un utilisateur (modifier tous les champs, réassigner).
- CRUD des agences / points de vente / profils / menus eux-mêmes.
- L'espace client (Lot 3.4).

---

## 2. Décisions (validées)

1. **Scoping hiérarchique** : agence → tous ses PDV + tous les users rattachés ; PDV seul → ce PDV ; cumul si plusieurs rattachements ; ADMIN → tout.
2. **STAFF créateur** : profils **non-ADMIN** uniquement, **dans son périmètre**, avec **au moins une** affectation agence/PDV obligatoire.
3. **Désactivation = `banUser`** (Better Auth, bloque le login), réactivation = `unbanUser`. Miroir sur `User.active`.
4. **Contrôle d'accès unifié** via `can(menuUrl, action)` (menu `/dashboard/utilisateurs`), utilisé côté UI (afficher/masquer) **et** API (garde — la sécurité est serveur).
5. Toutes les règles de périmètre/rôle **revalidées côté serveur** ; le client ne fait que confort d'UX.

---

## 3. Scoping (`src/lib/scope.ts`)

```ts
type ScopedUser = { id: string; role: string | null; profileId: string };

/** Agences dont l'user est membre direct. ADMIN → null (= toutes). */
getScopedAgencyIds(user): Promise<string[] | null>

/** PDV dont l'user est membre + tous les PDV de ses agences. ADMIN → null. */
getScopedPointOfSaleIds(user): Promise<string[] | null>

/** Clause Prisma « users du périmètre ». ADMIN → {} (aucun filtre). */
getScopedUserWhere(user): Promise<Prisma.UserWhereInput>

/** Lève 403 si une affectation sort du périmètre (ignoré pour ADMIN). */
assertWithinScope(user, { agencyIds, pointOfSaleIds }): Promise<void>
```

**Logique `getScopedUserWhere` (STAFF)** — un user est dans le périmètre s'il est membre d'une
agence scopée **ou** d'un PDV scopé :
```ts
{
  OR: [
    { agencyMembers: { some: { agencyId: { in: agencyIds } } } },
    { posMembers:    { some: { pointOfSaleId: { in: posIds } } } },
  ],
}
```

**`getScopedPointOfSaleIds` (STAFF)** = `PointOfSaleMember` directs ∪ `PointOfSale.findMany({ where: { agencyId: { in: agencyIds } } })`.

Toutes ces lectures réutilisent le cache par requête (`cache()`), et les tags du 3.1 si pertinents.

---

## 4. Permission `can` (ajout dans `src/lib/authz.ts`)

```ts
/** ADMIN → true ; sinon lit getUserMenus et vérifie le droit sur le menu. */
export async function can(
  menuUrl: string,
  action: "read" | "create" | "update" | "delete",
): Promise<boolean>;
```

Utilisé : bouton « Créer » (UI), gardes des endpoints (`/api/users` POST, `/api/users/[id]` PATCH).

---

## 5. Extension `POST /api/users`

**Schéma zod étendu** (`createUserSchema`) : `+ agencyIds: string[].optional()`, `+ pointOfSaleIds: string[].optional()`.

**Handler** :
1. `assertSameOrigin(req)` (déjà en place).
2. `requireUser()` ; garde `if (!(await can("/dashboard/utilisateurs", "create"))) → 403`.
3. Valider le corps (zod).
4. Charger le profil cible (`type`). Déterminer `role` (ADMIN→admin, STAFF→staff, CLIENT→user).
5. **Si créateur non-ADMIN** :
   - profil cible de type ADMIN → **403** (pas d'escalade) ;
   - `assertWithinScope(user, { agencyIds, pointOfSaleIds })` ;
   - au moins une affectation → sinon **422** (« affectation requise »).
6. Créer l'utilisateur via `auth.api.createUser` (mdp aléatoire, `role`, `data` additionnels, `createdById`).
7. Créer les `AgencyMember` / `PointOfSaleMember` dans `prisma.$transaction`. **En cas d'échec**, compensation : supprimer l'utilisateur créé (best-effort) et renvoyer 500.
8. `requestPasswordReset` → email d'invitation.
9. `201 { data: { id, email } }`.

---

## 6. Activer / désactiver — `PATCH /api/users/[id]`

**Corps** : `{ active: boolean }` (zod).
**Handler** :
1. `assertSameOrigin` ; `requireUser` ; garde `can("/dashboard/utilisateurs", "update")` → sinon 403.
2. Charger l'utilisateur cible ; s'il est **hors périmètre** du demandeur (non-ADMIN) → 403 ; si cible ADMIN et demandeur non-ADMIN → 403.
3. `active === false` → `auth.api.banUser({ body: { userId } })` + `prisma.user.update({ active: false })`.
   `active === true` → `auth.api.unbanUser({ body: { userId } })` + `active: true`.
4. `200 { data: { id, active } }`.

> Le ban Better Auth empêche réellement la connexion (contrairement au seul champ `active`).

---

## 7. Page liste — `src/app/dashboard/utilisateurs/page.tsx`

- Server component : `await requirePermission("read")`.
- Charge les users **scopés** (`getScopedUserWhere`) avec `profile`, `agencyMembers.agency`, `posMembers.pointOfSale`. Lit aussi `can(..., "create")` pour le bouton.
- Passe les données à un composant client `_components/users-table.tsx` :
  - Colonnes : Nom, Email, Profil, Agences/PDV, Statut (badge actif/inactif), Actions (bouton activer/désactiver → `PATCH`).
  - **Filtres** (client) : profil, agence ; **recherche** nom/email.
  - Bouton « Créer un utilisateur » → `/dashboard/utilisateurs/nouveau` (si `canCreate`).
- ADMIN voit tout ; STAFF son périmètre.

---

## 8. Formulaire de création — `src/app/dashboard/utilisateurs/nouveau/page.tsx`

- Server component : `await requirePermission("create")` (canCreate requis pour accéder). Charge les **options scopées** :
  - profils : tous (ADMIN) / hors type ADMIN (STAFF) ;
  - agences + PDV : tous (ADMIN) / périmètre (STAFF).
- Passe les options à `_components/create-user-form.tsx` (client, rhf+zod) :
  - Champs : email, prénom, nom, téléphone, profil (select), agences (multi cases à cocher), PDV (multi).
  - Validation client (zod) ; erreurs de champ ; état de soumission.
  - Soumission → `http.post("/users", data)` ; succès → redirection `/dashboard/utilisateurs` + toast « Invitation envoyée » ; erreurs API (403/422) mappées aux champs.
- La sécurité réelle (périmètre, non-escalade) est **revalidée par l'API** (§5) — le formulaire n'est que du confort.

---

## 9. Fichiers

**Créés :** `src/lib/scope.ts`, `src/app/dashboard/utilisateurs/page.tsx`, `src/app/dashboard/utilisateurs/_components/users-table.tsx`, `src/app/dashboard/utilisateurs/nouveau/page.tsx`, `src/app/dashboard/utilisateurs/nouveau/_components/create-user-form.tsx`, `src/app/api/users/[id]/route.ts`.
**Modifiés :** `src/app/api/users/route.ts` (extension + garde `can`), `src/lib/validations/auth.ts` (schéma étendu + `toggleUserSchema`), `src/lib/authz.ts` (`can`).

---

## 10. Vérification & critères de succès

**Offline :** `tsc` + `npm run build` ; revue : toutes les gardes serveur présentes (can + scope + non-escalade), transaction + compensation sur création.

**Avec credentials (fin Lot 3) :**
1. ADMIN : voit tous les users, crée n'importe quel profil/agence, désactive n'importe qui.
2. STAFF (canCreate, membre agence A) : voit uniquement les users de A et ses PDV ; ne peut créer que des profils non-ADMIN affectés à A/ses PDV ; tentative hors périmètre (via API forgée) → 403.
3. Désactivation → l'user banni ne peut plus se connecter ; réactivation rétablit l'accès.
4. Création → email d'invitation reçu ; l'user définit son mdp et se connecte.

---

## 11. Notes de sécurité

- **Aucune confiance au client** : périmètre, non-escalade, `can` revalidés dans chaque endpoint.
- **SQL** : Prisma paramétré (déjà). **Origine** : `assertSameOrigin` sur les mutations.
- **Escalade** : un STAFF ne peut jamais créer/promouvoir un ADMIN ni sortir de son périmètre.
- **Cohérence transactionnelle** : memberships en `$transaction` + compensation si l'un échoue après la création du compte.
