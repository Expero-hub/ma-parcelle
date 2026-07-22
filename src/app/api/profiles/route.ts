import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { can } from "@/lib/authz";
import { profileSchema } from "@/lib/validations/profile";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
  if (!(await can("/dashboard/profils", "create"))) {
    throw new ApiError(403, "FORBIDDEN", "Vous n'avez pas le droit de creer des profils.");
  }

  const body = profileSchema.parse(await req.json());
  const profile = await prisma.profile.create({
    data: {
      name: body.name,
      description: body.description || null,
      type: "STAFF",
      isSystem: false,
      active: body.active ?? true,
    },
    select: { id: true, name: true },
  });

  revalidatePath("/dashboard/profils");
  return Response.json({ data: profile }, { status: 201 });
});
