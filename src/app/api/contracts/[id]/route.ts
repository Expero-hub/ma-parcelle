import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { requirePermission } from "@/lib/authz";

const updateContractSchema = z.object({
  totalAmount: z.number().min(0).optional(),
  periodicity: z.enum(["MONTHLY", "QUARTERLY", "BIANNUAL", "ANNUAL"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  agencyId: z.string().optional(),
  isActive: z.boolean().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
});

export const PATCH = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  await requirePermission("update");

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  const existing = await prisma.contract.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "Contrat introuvable.");
  }

  const body = updateContractSchema.parse(await req.json());

  // Prepare data for update
  const data: any = {};
  if (body.totalAmount !== undefined) {
    data.totalAmount = body.totalAmount;
  }
  if (body.periodicity !== undefined) {
    data.periodicity = body.periodicity;
  }
  if (body.startDate !== undefined) {
    data.startDate = body.startDate ? new Date(body.startDate) : null;
  }
  if (body.endDate !== undefined) {
    data.endDate = body.endDate ? new Date(body.endDate) : null;
  }
  if (body.agencyId !== undefined) {
    // Verify agency exists
    const agency = await prisma.agency.findUnique({
      where: { id: body.agencyId },
    });
    if (!agency) {
      throw new ApiError(422, "INVALID_AGENCY", "L'agence spécifiée n'existe pas.");
    }
    data.agencyId = body.agencyId;
  }
  if (body.isActive !== undefined) {
    data.isValidated = body.isActive;
    data.status = body.isActive ? "ACTIVE" : "DRAFT";
  }
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "CANCELLED") {
      data.isValidated = false;
      if (existing.parcelleId) {
        await prisma.parcelle.update({
          where: { id: existing.parcelleId },
          data: { status: "AVAILABLE" },
        });
      }
    }
  }

  const updated = await prisma.contract.update({
    where: { id },
    data,
    include: {
      agency: true,
      company: true,
      user: true,
    },
  });

  revalidatePath("/dashboard/importations/liste-des-contrats");
  return Response.json({ data: updated });
});
