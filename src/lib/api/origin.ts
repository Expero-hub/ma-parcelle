import { ApiError } from "@/lib/api/errors";

/**
 * Défense CSRF pour les routes mutantes : rejette si l'Origin ne correspond pas à l'hôte.
 * (Complément des cookies SameSite de Better Auth.)
 */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // navigations same-origin peuvent omettre Origin
  const host = req.headers.get("host");
  if (new URL(origin).host !== host) {
    throw new ApiError(403, "FORBIDDEN_ORIGIN", "Origine non autorisée.");
  }
}
