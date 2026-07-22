import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";

import { prisma } from "@/lib/prisma";
import { sendPasswordEmail } from "@/lib/email/templates";

// Resout l'URL de base sans dependre d'une valeur figee dans BETTER_AUTH_URL :
// - si BETTER_AUTH_URL est explicitement definie (ex: domaine custom en prod), on la prend.
// - sinon, en Production Vercel, VERCEL_PROJECT_PRODUCTION_URL donne l'URL stable du projet.
// - sinon, VERCEL_URL donne l'URL du deploiement courant (preview ou production sans domaine custom).
// - en dernier recours (dev local), on retombe sur localhost.
function resolveBaseUrl() {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;

  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

const baseUrl = resolveBaseUrl();

export const auth = betterAuth({
  baseURL: baseUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, token }) => {
      await sendPasswordEmail({
        to: user.email,
        name: user.name,
        link: `${baseUrl}/nouveau-mot-de-passe?token=${token}`,
      });
    },
  },
  user: {
    additionalFields: {
      firstName: { type: "string", required: false },
      lastName: { type: "string", required: false },
      phone: { type: "string", required: false },
      address: { type: "string", required: false },
      isValidated: { type: "boolean", required: false, defaultValue: false },
      active: { type: "boolean", required: false, defaultValue: true },
      profileId: { type: "string", required: true },
      companyId: { type: "string", required: false },
      createdById: { type: "string", required: false },
    },
  },
  plugins: [admin()],
});
