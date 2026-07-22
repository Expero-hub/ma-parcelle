import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const reservationSchema = z.object({
  reference: z.string().min(1, "La référence de parcelle est requise."),
});

export async function POST(req: Request) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });

    if (!session) {
      return NextResponse.json(
        {
          error: "UNAUTHORIZED",
          message: "Vous devez être connecté pour réserver une parcelle.",
        },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = reservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "INVALID_BODY",
          message: "Données de réservation invalides.",
        },
        { status: 400 },
      );
    }

    const { reference } = parsed.data;

    // 1. Trouve la parcelle par sa référence
    const parcelle = await prisma.parcelle.findFirst({
      where: { reference, deletedAt: null },
    });

    if (!parcelle) {
      return NextResponse.json(
        {
          error: "NOT_FOUND",
          message: "Parcelle introuvable.",
        },
        { status: 404 },
      );
    }

    if (parcelle.status !== "AVAILABLE") {
      return NextResponse.json(
        {
          error: "NOT_AVAILABLE",
          message: "Cette parcelle n'est plus disponible à la réservation.",
        },
        { status: 400 },
      );
    }

    // 2. Vérification obligatoire du contrat en cours pour le client
    const activeContract = await prisma.contract.findFirst({
      where: {
        userId: session.user.id,
        status: "ACTIVE",
        deletedAt: null,
      },
    });

    if (!activeContract) {
      return NextResponse.json(
        {
          error: "NO_ACTIVE_CONTRACT",
          message:
            "La réservation de parcelle est strictement réservée aux clients ayant un contrat en cours (actif). Veuillez contacter notre agence.",
        },
        { status: 403 },
      );
    }

    // 3. Créer la réservation et passer le statut de la parcelle à RESERVED
    const reservation = await prisma.$transaction(async (tx) => {
      const res = await tx.reservation.create({
        data: {
          parcelleId: parcelle.id,
          userId: session.user.id,
          contractId: activeContract.id,
          status: "PENDING",
        },
      });

      await tx.parcelle.update({
        where: { id: parcelle.id },
        data: { status: "RESERVED" },
      });

      return res;
    });

    return NextResponse.json({
      success: true,
      data: reservation,
      message: `Réservation enregistrée avec succès sous votre contrat N° ${activeContract.reference}.`,
    });
  } catch (err: any) {
    console.error("Erreur API Réservation:", err);
    return NextResponse.json(
      {
        error: "SERVER_ERROR",
        message: "Une erreur interne s'est produite lors de la réservation.",
      },
      { status: 500 },
    );
  }
}
