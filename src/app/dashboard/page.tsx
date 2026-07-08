import { getCurrentUser, requirePermission } from "@/lib/authz";

export default async function DashboardPage() {
  await requirePermission();
  const user = await getCurrentUser();

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-display text-2xl font-semibold text-text">
        Bonjour {user?.name}
      </h1>
      <p className="mt-1 text-sm text-text-2">Bienvenue sur votre tableau de bord.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["Parcelles", "Réservations", "Contrats"].map((label) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-text-2">{label}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-text">—</p>
            <p className="mt-1 text-xs text-text-2">Statistiques à venir</p>
          </div>
        ))}
      </div>
    </div>
  );
}
