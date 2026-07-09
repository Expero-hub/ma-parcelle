# Lot 3.4 — Espace client : Implementation Plan

**Goal:** Coquille `/mon-espace` réutilisant `DashboardShell` avec nav statique + pages (accueil, réservations/contrats placeholders, profil réel).

**Référence spec :** `docs/superpowers/specs/2026-07-08-lot3-4-espace-client-design.md`

**Vérification :** `npx tsc --noEmit` + `npm run build`. **Commit :** staging chirurgical.

---

## Task 1: Layout espace client (nav statique + shell)

**Files:** Create: `src/app/mon-espace/layout.tsx`

```tsx
import { requireUser } from "@/lib/authz";
import type { SidebarModule } from "@/lib/dashboard-nav";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const CLIENT_NAV: SidebarModule[] = [
  {
    id: "client",
    name: "Mon espace",
    items: [
      { id: "home", name: "Tableau de bord", url: "/mon-espace", icon: "gauge", children: [] },
      { id: "resa", name: "Mes réservations", url: "/mon-espace/reservations", icon: "bookmark", children: [] },
      { id: "contrats", name: "Mes contrats", url: "/mon-espace/contrats", icon: "file-text", children: [] },
      { id: "profil", name: "Mon profil", url: "/mon-espace/profil", icon: "users", children: [] },
    ],
  },
];

export default async function MonEspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <DashboardShell tree={CLIENT_NAV} userName={user.name}>
      {children}
    </DashboardShell>
  );
}
```

Verify: `npx tsc --noEmit`. Commit: `feat(client): mon-espace shell with static client navigation`.

---

## Task 2: Pages accueil + placeholders + profil

**Files:** Modify `src/app/mon-espace/page.tsx` ; Create `reservations/page.tsx`, `contrats/page.tsx`, `profil/page.tsx`.

**`src/app/mon-espace/page.tsx`** (accueil) :
```tsx
import { getCurrentUser } from "@/lib/authz";

export default async function MonEspacePage() {
  const user = await getCurrentUser();
  return (
    <div className="p-6 md:p-8">
      <h1 className="font-display text-2xl font-semibold text-text">Bonjour {user?.name}</h1>
      <p className="mt-1 text-sm text-text-2">Bienvenue dans votre espace personnel.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {["Mes réservations", "Mes contrats"].map((label) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-text-2">{label}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-text">—</p>
            <p className="mt-1 text-xs text-text-2">Bientôt disponible</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**`src/app/mon-espace/reservations/page.tsx`** :
```tsx
export default function ReservationsPage() {
  return (
    <div className="p-6 md:p-8">
      <h1 className="font-display text-2xl font-semibold text-text">Mes réservations</h1>
      <p className="mt-2 text-text-2">Vos réservations apparaîtront ici prochainement.</p>
    </div>
  );
}
```

**`src/app/mon-espace/contrats/page.tsx`** :
```tsx
export default function ContratsPage() {
  return (
    <div className="p-6 md:p-8">
      <h1 className="font-display text-2xl font-semibold text-text">Mes contrats</h1>
      <p className="mt-2 text-text-2">Vos contrats apparaîtront ici prochainement.</p>
    </div>
  );
}
```

**`src/app/mon-espace/profil/page.tsx`** (infos réelles) :
```tsx
import { getCurrentUser } from "@/lib/authz";

export default async function ProfilPage() {
  const user = await getCurrentUser();
  const rows: [string, string][] = [
    ["Nom", user?.name ?? "—"],
    ["Email", user?.email ?? "—"],
    ["Téléphone", (user as { phone?: string | null } | null)?.phone ?? "—"],
  ];
  return (
    <div className="p-6 md:p-8">
      <h1 className="mb-6 font-display text-2xl font-semibold text-text">Mon profil</h1>
      <dl className="max-w-md divide-y divide-border rounded-2xl border border-border bg-surface">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between px-5 py-4">
            <dt className="text-sm text-text-2">{k}</dt>
            <dd className="text-sm font-medium text-text">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
```

Verify: `npx tsc --noEmit`. Commit: `feat(client): mon-espace home, placeholders and profile pages`.

---

## Task 3: Build global

`npx tsc --noEmit` + `npm run build` → routes `/mon-espace`, `/mon-espace/{reservations,contrats,profil}` présentes.
