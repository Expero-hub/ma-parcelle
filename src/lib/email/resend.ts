import { Resend } from "resend";

/**
 * Instanciation paresseuse : le client Resend n'est créé qu'au premier envoi.
 * Évite que `new Resend(undefined)` ne lève « Missing API key » au chargement du
 * module (build Next.js / imports transitifs via `@/lib/auth`).
 */
let client: Resend | null = null;

export function getResend(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}
