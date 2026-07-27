import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Proxy Next.js 16 (ex-`middleware.ts`, renommé en v16). S'exécute AVANT le rendu,
 * pour toutes les routes couvertes par `config.matcher` ci-dessous.
 *
 * Rôle : barrière d'authentification GROSSIÈRE et OPTIMISTE.
 *  - Il vérifie seulement la PRÉSENCE du cookie de session (pas sa validité, pas la DB).
 *    Le runtime doit rester léger et rapide → aucune requête Prisma ici.
 *  - La vraie autorisation (rôle, permission par menu, scoping) est faite côté serveur
 *    dans les layouts/pages/route handlers via `src/lib/authz.ts`. Ne jamais se reposer
 *    sur le proxy seul pour la sécurité (recommandation Next.js « Data Security »).
 */
export function proxy(request: NextRequest) {
  // Présence du cookie de session Better Auth (lecture edge-safe, sans accès DB).
  const hasSession = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Non authentifié → redirection vers la connexion, en mémorisant la destination
  // voulue dans `?redirect=` pour y revenir après login.
  if (!hasSession) {
    const url = new URL("/connexion", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Authentifié : on laisse passer, mais on injecte le chemin courant dans un header
  // `x-pathname`. Les Server Components ne connaissent pas nativement l'URL demandée ;
  // `requirePermission()` (authz.ts) lit ce header pour savoir quel menu vérifier.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

// Ne fait tourner le proxy que sur les zones protégées (dashboard + espace client).
// Les routes publiques (accueil, /parcelles, /connexion…) ne sont pas concernées.
export const config = {
  matcher: ["/dashboard/:path*", "/mon-espace/:path*", "/mon-compte"],
};
