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
          success: false,
          error: "UNAUTHORIZED",
          message: "Vous devez être connecté pour manifester une intention d'achat.",
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = reservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_BODY",
          message: "Données de demande invalides.",
        },
        { status: 400 }
      );
    }

    const { reference } = parsed.data;

    // 1. Trouver la parcelle
    const parcelle = await prisma.parcelle.findFirst({
      where: { reference, deletedAt: null },
    });

    if (!parcelle) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "Parcelle introuvable.",
        },
        { status: 404 }
      );
    }

    if (parcelle.status !== "AVAILABLE") {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_AVAILABLE",
          message: "Cette parcelle n'est plus disponible à l'achat.",
        },
        { status: 400 }
      );
    }

    // 2. Vérifier si le client a un contrat (DRAFT ou ACTIVE) lié à cette parcelle
    const userContract = await prisma.contract.findFirst({
      where: {
        userId: session.user.id,
        parcelleId: parcelle.id,
        status: { in: ["DRAFT", "ACTIVE"] },
        deletedAt: null,
      },
    });

    // S'il n'y a pas de contrat, rediriger vers le wizard de souscription
    if (!userContract) {
      return NextResponse.json({
        success: false,
        code: "NO_CONTRACT",
        message: "Vous devez remplir un dossier de souscription pour cette parcelle.",
      });
    }

    // 3. Vérifier s'il y a déjà une intention d'achat en cours
    const existingReservation = await prisma.reservation.findFirst({
      where: {
        userId: session.user.id,
        parcelleId: parcelle.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        deletedAt: null,
      },
    });

    if (existingReservation) {
      return NextResponse.json({
        success: true,
        data: existingReservation,
        message: "Votre intention d'achat a déjà été enregistrée pour cette parcelle.",
      });
    }

    // 4. Vérifier la limite des 5 intentions d'achat actives (PENDING)
    const pendingCount = await prisma.reservation.count({
      where: {
        userId: session.user.id,
        status: "PENDING",
        deletedAt: null,
      },
    });

    if (pendingCount >= 5) {
      return NextResponse.json(
        {
          success: false,
          code: "LIMIT_REACHED",
          message: "Vous ne pouvez pas soumettre plus de 5 intentions d'achat actives simultanément.",
        },
        { status: 400 }
      );
    }

    // 5. Créer la réservation (sans modifier le statut de la parcelle, qui reste AVAILABLE pour d'autres clients)
    const reservation = await prisma.reservation.create({
      data: {
        parcelleId: parcelle.id,
        userId: session.user.id,
        contractId: userContract.id,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      data: reservation,
      message: `Votre intention d'achat a été enregistrée avec succès sous le contrat de référence ${userContract.reference}.`,
    });
  } catch (err: any) {
    console.error("Erreur API Réservation/Intention:", err);
    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: "Une erreur interne s'est produite lors de l'enregistrement.",
      },
      { status: 500 }
    );
  }
}
