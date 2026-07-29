import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { can } from "@/lib/authz";
import { getScopedPointOfSaleIds, type ScopedUser } from "@/lib/scope";

const updateParcelleSchema = z.object({
  reference: z.string().optional(),
  area: z.number().positive().optional(),
  price: z.number().nonnegative().optional(),
  minDuration: z.number().int().nonnegative().optional(),
  maxDuration: z.number().int().nonnegative().optional(),
  pointOfSaleId: z.string().optional(),
  zoneId: z.string().optional(),
  description: z.string().optional(),
  geom: z.any().optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(["AVAILABLE", "RESERVED", "SOLD"]).optional(),
  tauxSansRisque: z.number().nonnegative().optional().nullable(),
  volatilite: z.number().nonnegative().optional().nullable(),
  fraisMutation: z.number().nonnegative().optional().nullable(),
  tauxActuariel: z.number().nonnegative().optional().nullable(),
  fraisGestion: z.number().nonnegative().optional().nullable(),
  fraisAcquisition: z.number().nonnegative().optional().nullable(),
});

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
    if (!(await can("/dashboard/parcelles", "read"))) {
      throw new ApiError(403, "FORBIDDEN", "Droit insuffisant.");
    }

    const user = session.user as ScopedUser;
    const scopedPosIds = await getScopedPointOfSaleIds(user);

    const parcelle = await prisma.parcelle.findFirst({
      where: { id, deletedAt: null },
      include: {
        zone: true,
        pointOfSale: {
          include: { agency: true },
        },
        images: { orderBy: { order: "asc" } },
        contracts: {
          where: { deletedAt: null, status: { not: "CANCELLED" } },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                createdAt: true,
              },
            },
            installments: {
              include: { payments: true },
              orderBy: { startDate: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!parcelle) {
      throw new ApiError(404, "NOT_FOUND", "Parcelle introuvable.");
    }

    if (scopedPosIds !== null && (!parcelle.pointOfSaleId || !scopedPosIds.includes(parcelle.pointOfSaleId))) {
      throw new ApiError(403, "OUT_OF_SCOPE", "Parcelle hors de votre périmètre.");
    }

    // Process contract details if linked
    let contractDetails = null;
    let clientDetails = null;
    let recoveryRate = 0;
    let totalPaid = 0;
    let totalContractAmount = 0;

    const activeContract = parcelle.contracts[0];
    if (activeContract) {
      totalContractAmount = Number(activeContract.totalAmount);
      // sum payments
      for (const inst of activeContract.installments) {
        for (const pay of inst.payments) {
          totalPaid += Number(pay.amount);
        }
      }

      if (totalContractAmount > 0) {
        recoveryRate = Math.round((totalPaid / totalContractAmount) * 100);
      }

      // Format installments (echeancier)
      const installments = activeContract.installments.map((inst: any) => {
        let instPaid = 0;
        for (const pay of inst.payments) {
          instPaid += Number(pay.amount);
        }
        return {
          id: inst.id,
          reference: inst.reference,
          amount: Number(inst.amount),
          status: inst.status,
          startDate: inst.startDate,
          endDate: inst.endDate,
          paidAmount: instPaid,
        };
      });

      contractDetails = {
        id: activeContract.id,
        reference: activeContract.reference,
        startDate: activeContract.startDate,
        endDate: activeContract.endDate,
        totalAmount: totalContractAmount,
        status: activeContract.status,
        periodicity: activeContract.periodicity,
        installmentAmount: activeContract.installmentAmount ? Number(activeContract.installmentAmount) : null,
        paidAmount: totalPaid,
        remainingAmount: Math.max(0, totalContractAmount - totalPaid),
        installments,
      };

      clientDetails = {
        id: activeContract.user.id,
        name: activeContract.user.name,
        email: activeContract.user.email,
        phone: activeContract.user.phone ?? "—",
        createdAt: activeContract.user.createdAt,
      };
    }

    const primaryImage = parcelle.images.find((img) => img.isPrimary) || parcelle.images[0];

    const formatted = {
      id: parcelle.id,
      reference: parcelle.reference,
      area: Number(parcelle.area),
      price: Number(parcelle.price),
      status: parcelle.status,
      minDuration: parcelle.minDuration ?? 1,
      maxDuration: parcelle.maxDuration ?? 5,
      description: parcelle.description ?? "",
      geom: parcelle.geom,
      tauxSansRisque: parcelle.tauxSansRisque ? Number(parcelle.tauxSansRisque) : null,
      volatilite: parcelle.volatilite ? Number(parcelle.volatilite) : null,
      fraisMutation: parcelle.fraisMutation ? Number(parcelle.fraisMutation) : null,
      tauxActuariel: parcelle.tauxActuariel ? Number(parcelle.tauxActuariel) : null,
      fraisGestion: parcelle.fraisGestion ? Number(parcelle.fraisGestion) : null,
      fraisAcquisition: parcelle.fraisAcquisition ? Number(parcelle.fraisAcquisition) : null,
      block: parcelle.block ?? "",
      lot: parcelle.lot ?? "",
      zone: {
        id: parcelle.zone.id,
        code: parcelle.zone.code,
        commune: parcelle.zone.commune ?? "",
        district: parcelle.zone.district ?? "",
        department: parcelle.zone.department ?? "",
        fullAddress: parcelle.zone.fullAddress ?? "",
        longitude: parcelle.zone.longitude ? Number(parcelle.zone.longitude) : null,
        latitude: parcelle.zone.latitude ? Number(parcelle.zone.latitude) : null,
      },
      pointOfSale: parcelle.pointOfSale
        ? {
            id: parcelle.pointOfSale.id,
            name: parcelle.pointOfSale.name,
            agencyName: parcelle.pointOfSale.agency.name,
          }
        : null,
      images: parcelle.images.map((img) => ({
        id: img.id,
        path: img.path,
        isPrimary: img.isPrimary,
        order: img.order,
      })),
      primaryImageUrl: primaryImage?.path ?? null,
      contract: contractDetails,
      client: clientDetails,
      recoveryRate,
    };

    return NextResponse.json({ data: formatted });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
    if (!(await can("/dashboard/parcelles", "update"))) {
      throw new ApiError(403, "FORBIDDEN", "Droit insuffisant.");
    }

    const body = updateParcelleSchema.parse(await req.json());
    const user = session.user as ScopedUser;
    const scopedPosIds = await getScopedPointOfSaleIds(user);

    const parcelle = await prisma.parcelle.findUnique({
      where: { id },
      select: { id: true, pointOfSaleId: true },
    });
    if (!parcelle) throw new ApiError(404, "NOT_FOUND", "Parcelle introuvable.");

    if (scopedPosIds !== null && (!parcelle.pointOfSaleId || !scopedPosIds.includes(parcelle.pointOfSaleId))) {
      throw new ApiError(403, "OUT_OF_SCOPE", "Parcelle hors de votre périmètre.");
    }

    if (body.pointOfSaleId && scopedPosIds !== null && !scopedPosIds.includes(body.pointOfSaleId)) {
      throw new ApiError(403, "OUT_OF_SCOPE", "Le point de vente sélectionné est hors de votre périmètre.");
    }

    // Resolve bareme parameters if not customized (or if "PAR DEFAUT")
    let tauxSansRisque = body.tauxSansRisque;
    let volatilite = body.volatilite;
    let fraisMutation = body.fraisMutation;
    let tauxActuariel = body.tauxActuariel;
    let fraisGestion = body.fraisGestion;
    let fraisAcquisition = body.fraisAcquisition;

    if (tauxSansRisque === null) {
      const activeBareme = await prisma.baremeTechniqueDefaut.findFirst({
        where: { isActive: true },
        orderBy: { effectiveFrom: "desc" },
      });
      if (activeBareme) {
        tauxSansRisque = Number(activeBareme.tauxSansRisque);
        volatilite = Number(activeBareme.volatilite);
        fraisMutation = Number(activeBareme.fraisMutation);
        tauxActuariel = Number(activeBareme.tauxActuariel);
        fraisGestion = Number(activeBareme.fraisGestion);
        fraisAcquisition = Number(activeBareme.fraisAcquisition);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.parcelle.update({
        where: { id },
        data: {
          reference: body.reference,
          area: body.area,
          price: body.price,
          minDuration: body.minDuration,
          maxDuration: body.maxDuration,
          pointOfSaleId: body.pointOfSaleId,
          zoneId: body.zoneId,
          description: body.description,
          geom: body.geom,
          status: body.status,
          ...(tauxSansRisque !== undefined && { tauxSansRisque }),
          ...(volatilite !== undefined && { volatilite }),
          ...(fraisMutation !== undefined && { fraisMutation }),
          ...(tauxActuariel !== undefined && { tauxActuariel }),
          ...(fraisGestion !== undefined && { fraisGestion }),
          ...(fraisAcquisition !== undefined && { fraisAcquisition }),
        },
      });

      if (body.images !== undefined) {
        await tx.parcelleImage.deleteMany({ where: { parcelleId: id } });
        if (body.images.length > 0) {
          await Promise.all(
            body.images.map((imgUrl, idx) =>
              tx.parcelleImage.create({
                data: {
                  parcelleId: id,
                  path: imgUrl,
                  isPrimary: idx === 0,
                  order: idx,
                },
              })
            )
          );
        }
      }

      return p;
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
    if (!(await can("/dashboard/parcelles", "delete"))) {
      throw new ApiError(403, "FORBIDDEN", "Droit insuffisant.");
    }

    const user = session.user as ScopedUser;
    const scopedPosIds = await getScopedPointOfSaleIds(user);

    const parcelle = await prisma.parcelle.findUnique({
      where: { id },
      select: { id: true, pointOfSaleId: true },
    });
    if (!parcelle) throw new ApiError(404, "NOT_FOUND", "Parcelle introuvable.");

    if (scopedPosIds !== null && (!parcelle.pointOfSaleId || !scopedPosIds.includes(parcelle.pointOfSaleId))) {
      throw new ApiError(403, "OUT_OF_SCOPE", "Parcelle hors de votre périmètre.");
    }

    await prisma.parcelle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ data: { id, deleted: true } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
