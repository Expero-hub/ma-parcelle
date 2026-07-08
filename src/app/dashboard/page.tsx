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
