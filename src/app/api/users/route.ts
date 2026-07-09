import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { can } from "@/lib/authz";
import { assertWithinScope } from "@/lib/scope";
import { createUserSchema } from "@/lib/validations/auth";

/** Mot de passe temporaire aléatoire fort, jamais transmis (l'utilisateur le remplace via le lien). */
function randomPassword(): string {
  return randomBytes(24).toString("base64url") + "aA1!";
}

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
  if (!(await can("/dashboard/utilisateurs", "create"))) {
    throw new ApiError(403, "FORBIDDEN", "Vous n'avez pas le droit de créer des utilisateurs.");
  }

  const creator = session.user;
  const creatorIsAdmin = (creator.role ?? "user") === "admin";
  const body = createUserSchema.parse(await req.json());

  const profile = await prisma.profile.findUnique({
    where: { id: body.profileId },
    select: { type: true },
  });
  if (!profile) {
    throw new ApiError(422, "INVALID_PROFILE", "Profil introuvable.", { profileId: "Profil invalide." });
  }
  const role = profile.type === "ADMIN" ? "admin" : profile.type === "STAFF" ? "staff" : "user";

  if (!creatorIsAdmin) {
    if (profile.type === "ADMIN") {
      throw new ApiError(403, "NO_ESCALATION", "Vous ne pouvez pas créer d'administrateur.");
    }
    await assertWithinScope(creator, {
      agencyIds: body.agencyIds,
      pointOfSaleIds: body.pointOfSaleIds,
    });
    if (body.agencyIds.length === 0 && body.pointOfSaleIds.length === 0) {
      throw new ApiError(422, "SCOPE_REQUIRED", "Au moins une agence ou un point de vente est requis.", {
        agencyIds: "Sélectionnez au moins une affectation.",
      });
    }
  }

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
        createdById: creator.id,
      },
    },
    headers: h,
  });
  const userId = created.user.id;

  try {
    await prisma.$transaction([
      ...body.agencyIds.map((agencyId) => prisma.agencyMember.create({ data: { userId, agencyId } })),
      ...body.pointOfSaleIds.map((pointOfSaleId) =>
        prisma.pointOfSaleMember.create({ data: { userId, pointOfSaleId } }),
      ),
    ]);
  } catch {
    // Compensation : Better Auth a déjà créé le compte hors transaction Prisma.
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    throw new ApiError(500, "CREATE_FAILED", "Échec de l'affectation ; création annulée.");
  }

  // Déclenche l'email d'invitation (template neutre) via le token de reset.
  await auth.api.requestPasswordReset({
    body: { email: body.email, redirectTo: "/nouveau-mot-de-passe" },
  });

  return Response.json({ data: { id: userId, email: created.user.email } }, { status: 201 });
});
