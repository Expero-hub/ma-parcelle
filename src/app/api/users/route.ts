import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { createUserSchema } from "@/lib/validations/auth";

/** Mot de passe temporaire aléatoire fort, jamais transmis (l'utilisateur le remplace via le lien). */
function randomPassword(): string {
  return randomBytes(24).toString("base64url") + "aA1!";
}

export const POST = route(async (req: NextRequest) => {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
  if (session.user.role !== "admin") throw new ApiError(403, "FORBIDDEN", "Réservé aux administrateurs.");

  const body = createUserSchema.parse(await req.json());

  const profile = await prisma.profile.findUnique({
    where: { id: body.profileId },
    select: { type: true },
  });
  if (!profile) {
    throw new ApiError(422, "INVALID_PROFILE", "Profil introuvable.", { profileId: "Profil invalide." });
  }
  const role = profile.type === "ADMIN" ? "admin" : profile.type === "STAFF" ? "staff" : "user";

  const created = await auth.api.createUser({
    body: {
      email: body.email,
      password: randomPassword(),
      name: `${body.firstName} ${body.lastName}`.trim(),
      // Le plugin admin ne whitelist que "user"/"admin" côté types ; "staff" est
      // un rôle valide stocké tel quel à l'exécution.
      role: role as "user" | "admin",
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        profileId: body.profileId,
        companyId: body.companyId,
        createdById: session.user.id,
      },
    },
    headers: h,
  });

  // Déclenche l'email d'invitation (template neutre) via le token de reset.
  await auth.api.requestPasswordReset({
    body: { email: body.email, redirectTo: "/nouveau-mot-de-passe" },
  });

  return Response.json({ data: { id: created.user.id, email: created.user.email } }, { status: 201 });
});
