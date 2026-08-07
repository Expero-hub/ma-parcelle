import { requireUser } from "@/lib/authz";
import type { SidebarModule } from "@/lib/dashboard-nav";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

/** Navigation statique de l'espace client (pas de menus DB : les clients n'ont pas de permissions). */
const CLIENT_NAV: SidebarModule[] = [
  {
    id: "client",
    name: "Mon espace",
    items: [
      { id: "home", name: "Tableau de bord", url: "/mon-espace", icon: "gauge", children: [] },
      { id: "intentions", name: "Mes intentions d'achat", url: "/mon-espace/intentions", icon: "heart", children: [] },
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
