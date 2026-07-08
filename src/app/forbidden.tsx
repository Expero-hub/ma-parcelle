import Link from "next/link";

import { BrandLogo } from "@/components/shared/brand-logo";

export default function Forbidden() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-4 text-center">
      <BrandLogo />
      <div>
        <p className="font-display text-5xl font-semibold text-primary">403</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-text">Accès refusé</h1>
        <p className="mt-2 max-w-md text-sm text-text-2">
          Vous n'avez pas les droits nécessaires pour accéder à cette section. Si vous pensez qu'il
          s'agit d'une erreur, contactez un administrateur.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-lg bg-primary px-5 py-2.5 font-sans text-sm font-semibold text-on-primary"
      >
        Retour au tableau de bord
      </Link>
    </main>
  );
}
