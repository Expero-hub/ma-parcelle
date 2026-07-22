import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { can } from "@/lib/authz";
import { assertWithinScope, getScopedAgencyIds, type ScopedUser } from "@/lib/scope";
import { createAgencySchema } from "@/lib/validations/org";

async function requireSession() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
  return session.user as ScopedUser;
}

const updateAgencySchema = createAgencySchema.extend({
  active: z.boolean().optional(),
});

export const PATCH = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requireSession();
  if (!(await can("/dashboard/agences", "update"))) {
    throw new ApiError(403, "FORBIDDEN", "Vous n'avez pas le droit de modifier les agences.");
  }

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  const existing = await prisma.agency.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "Agence introuvable.");
  }

  await assertWithinScope(user, { agencyIds: [id] });

  const body = updateAgencySchema.parse(await req.json());

  const agency = await prisma.agency.update({
    where: { id },
    data: body,
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      active: true,
    },
  });

  revalidatePath("/dashboard/agences");
  return Response.json({ data: agency });
});

export const DELETE = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requireSession();
  if (!(await can("/dashboard/agences", "delete"))) {
    throw new ApiError(403, "FORBIDDEN", "Vous n'avez pas le droit de supprimer les agences.");
  }

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  const existing = await prisma.agency.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "Agence introuvable.");
  }

  await assertWithinScope(user, { agencyIds: [id] });

  await prisma.agency.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      active: false,
    },
  });

  revalidatePath("/dashboard/agences");
  return Response.json({ data: { id, deleted: true } });
});
