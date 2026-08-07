import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });

    // 1. Authentification et rôles
    if (!session) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Non authentifié." },
        { status: 401 }
      );
    }

    const isStaffOrAdmin = session.user.role === "admin" || session.user.role === "staff";
    if (!isStaffOrAdmin) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Réservé aux membres du staff." },
        { status: 403 }
      );
    }

    // 2. Récupérer l'intention d'achat
    const reservation = await prisma.reservation.findFirst({
      where: { id, deletedAt: null },
      include: {
        parcelle: true,
        contract: {
          include: {
            installments: {
              where: { deletedAt: null },
              include: { payments: { where: { deletedAt: null } } },
            },
          },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "Intention d'achat introuvable." },
        { status: 404 }
      );
    }

    if (reservation.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "ALREADY_PROCESSED", message: "Cette intention d'achat a déjà été traitée." },
        { status: 400 }
      );
    }

    const contract = reservation.contract;
    if (!contract) {
      return NextResponse.json(
        { success: false, error: "NO_CONTRACT", message: "Aucun contrat associé à cette intention d'achat." },
        { status: 400 }
      );
    }

    // 3. Calculer l'éligibilité financière
    let totalPaid = 0;
    for (const inst of contract.installments) {
      for (const pay of inst.payments) {
        totalPaid += Number(pay.amount);
      }
    }

    const totalAmount = Number(contract.totalAmount);
    const durationMonths = contract.durationMonths;
    // Règle 1 : deux primes annuelles
    const annualPremium = (totalAmount * 12) / durationMonths;
    const threshold2Primes = 2 * annualPremium;
    // Règle 2 : 15% du total contractuel
    const threshold15Percent = 0.15 * totalAmount;

    // Seuil minimal requis
    const minimumRequired = Math.min(threshold2Primes, threshold15Percent);
    const isEligible = totalPaid >= threshold2Primes || totalPaid >= threshold15Percent;

    if (!isEligible) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_ELIGIBLE",
          message: `Le client n'est pas éligible. Montant versé : ${totalPaid.toLocaleString()} FCFA (Seuil minimum requis : ${Math.round(minimumRequired).toLocaleString()} FCFA).`,
        },
        { status: 400 }
      );
    }

    // 4. Exécuter la cascade de validation en base de données
    await prisma.$transaction(async (tx) => {
      // a. Valider la réservation choisie
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: "CONFIRMED" },
      });

      // b. Activer le contrat associé
      await tx.contract.update({
        where: { id: contract.id },
        data: { status: "ACTIVE", isValidated: true },
      });

      // c. Mettre à jour la parcelle à RESERVED
      await tx.parcelle.update({
        where: { id: reservation.parcelleId },
        data: { status: "RESERVED" },
      });

      // d. Annuler toutes les autres réservations PENDING sur cette parcelle
      await tx.reservation.updateMany({
        where: {
          parcelleId: reservation.parcelleId,
          id: { not: reservation.id },
          status: "PENDING",
        },
        data: { status: "CANCELLED" },
      });

      // e. Annuler les autres contrats DRAFT associés à cette parcelle
      await tx.contract.updateMany({
        where: {
          parcelleId: reservation.parcelleId,
          id: { not: contract.id },
          status: "DRAFT",
        },
        data: { status: "CANCELLED" },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Vente validée avec succès. Les autres intentions d'achat pour cette parcelle ont été annulées.",
    });
  } catch (err: any) {
    console.error("Erreur validation vente:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: "Erreur interne lors de la validation." },
      { status: 500 }
    );
  }
}
