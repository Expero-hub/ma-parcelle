import { getCurrentUser, requirePermission } from "@/lib/authz";

export default async function DashboardPage() {
  await requirePermission();
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-225 px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-text">Dashboard</h1>
      <p className="mt-2 text-text-2">Bonjour {user?.name} — le tableau de bord arrive au Lot 3.2.</p>
    </main>
  );
}
