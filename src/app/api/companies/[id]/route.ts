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
import { createCompanySchema } from "@/lib/validations/org";
import type { ScopedUser } from "@/lib/scope";

async function requireSession() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
  return session.user as ScopedUser;
}

async function requireAdminAccess(user: ScopedUser, action: "update" | "delete") {
  if (!(await can("/dashboard/compagnies", action))) {
    throw new ApiError(403, "FORBIDDEN", "Droit insuffisant.");
  }
  if ((user.role ?? "user") !== "admin") {
    throw new ApiError(403, "ADMIN_ONLY", "Seul un administrateur peut modifier/supprimer une compagnie.");
  }
}

const updateCompanySchema = createCompanySchema.extend({
  active: z.boolean().optional(),
});

export const PATCH = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requireSession();
  await requireAdminAccess(user, "update");

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  const existing = await prisma.company.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "Compagnie introuvable.");
  }

  const body = updateCompanySchema.parse(await req.json());

  const company = await prisma.company.update({
    where: { id },
    data: body,
    select: { id: true, name: true, address: true, phone: true, active: true },
  });

  revalidatePath("/dashboard/compagnies");
  return Response.json({ data: company });
});

export const DELETE = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requireSession();
  await requireAdminAccess(user, "delete");

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  const existing = await prisma.company.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "Compagnie introuvable.");
  }

  await prisma.company.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      active: false,
    },
  });

  revalidatePath("/dashboard/compagnies");
  return Response.json({ data: { id, deleted: true } });
});
