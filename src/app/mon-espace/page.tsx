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
