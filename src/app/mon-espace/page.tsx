import { requireUser } from "@/lib/authz";

export default async function MonEspacePage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-225 px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-text">Mon espace</h1>
      <p className="mt-2 text-text-2">Bonjour {user.name} — cet espace arrive au Lot 3.4.</p>
    </main>
  );
}
