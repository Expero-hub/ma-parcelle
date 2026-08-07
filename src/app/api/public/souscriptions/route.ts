import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { simulerPrimeParcelle } from "@/lib/simulation/simulation";
import { FrequencePaiement } from "@/lib/simulation/simulation.types";
import { Periodicity } from "@/generated/prisma/client";

const FREQUENCY_MAP: Record<number, Periodicity> = {
  12: "MONTHLY",
  4: "QUARTERLY",
  2: "BIANNUAL",
  1: "ANNUAL",
};

const souscriptionSchema = z.object({
  reference: z.string().min(1, "La référence de la parcelle est requise."),
  clientId: z.string().optional(), // Renseigné par le staff
  options: z.object({
    durationYears: z.number().min(1).max(7),
    frequency: z.number(), // 1, 2, 4, 12
    garantieDeces: z.boolean(),
    verseInit: z.number().min(0),
    signature: z.string().optional(),
  }),
  insured: z.object({
    fullName: z.string().min(1, "Le nom de l'assuré est requis."),
    birthDate: z.string().min(1, "La date de naissance de l'assuré est requise."),
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    relationship: z.string().min(1, "Le lien de parenté est requis."),
  }),
  beneficiary: z.object({
    fullName: z.string().min(1, "Le nom du bénéficiaire est requis."),
    relationship: z.string().min(1, "La relation est requise."),
    birthDate: z.string().optional(),
    sharePercentage: z.number().min(0).max(100).default(100),
    phone: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
  beneficiaryTerm: z.object({
    fullName: z.string().min(1, "Le nom du bénéficiaire au terme est requis."),
    relationship: z.string().min(1, "La relation est requise."),
    birthDate: z.string().optional(),
    sharePercentage: z.number().min(0).max(100).default(100),
    phone: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
  beneficiaryDeath: z.object({
    fullName: z.string().min(1, "Le nom du bénéficiaire en cas de décès est requis."),
    relationship: z.string().min(1, "La relation est requise."),
    birthDate: z.string().optional(),
    sharePercentage: z.number().min(0).max(100).default(100),
    phone: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
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
          message: "Vous devez être connecté pour effectuer une souscription.",
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = souscriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Données de souscription invalides.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { reference, clientId, options, insured, beneficiary, beneficiaryTerm, beneficiaryDeath } = parsed.data;

    // Déterminer l'utilisateur cible (le client)
    let targetUserId = session.user.id;
    const isStaffOrAdmin = session.user.role === "admin" || session.user.role === "staff";

    if (clientId) {
      if (!isStaffOrAdmin) {
        return NextResponse.json(
          {
            success: false,
            error: "FORBIDDEN",
            message: "Vous n'êtes pas autorisé à créer une souscription pour un autre client.",
          },
          { status: 403 }
        );
      }
      targetUserId = clientId;
    }

    // Charger les informations du client
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, deletedAt: null },
    });

    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
          message: "Client introuvable.",
        },
        { status: 404 }
      );
    }

    if (!targetUser.companyId) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_COMPANY",
          message: "Le client doit être associé à une compagnie d'assurance.",
        },
        { status: 400 }
      );
    }

    // 1. Vérifier la limite des 5 intentions d'achat actives (PENDING)
    const pendingCount = await prisma.reservation.count({
      where: {
        userId: targetUserId,
        status: "PENDING",
        deletedAt: null,
      },
    });

    if (pendingCount >= 5) {
      return NextResponse.json(
        {
          success: false,
          error: "LIMIT_REACHED",
          message: isStaffOrAdmin
            ? "Ce client a déjà atteint la limite maximale de 5 intentions d'achat actives."
            : "Vous ne pouvez pas soumettre plus de 5 intentions d'achat actives simultanément.",
        },
        { status: 400 }
      );
    }

    // 2. Charger la parcelle
    const parcelle = await prisma.parcelle.findFirst({
      where: { reference, deletedAt: null },
      include: { pointOfSale: true },
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
          message: "Cette parcelle n'est plus disponible à l'acquisition.",
        },
        { status: 400 }
      );
    }

    const agencyId = parcelle.pointOfSale?.agencyId;
    if (!agencyId) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_AGENCY",
          message: "La parcelle n'est rattachée à aucune agence commerciale.",
        },
        { status: 400 }
      );
    }

    // 3. Calculer l'âge de l'assuré
    const birthDate = new Date(insured.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // 4. Calculer la prime
    let simulation;
    try {
      simulation = simulerPrimeParcelle({
        parcelle: {
          valeurParcelle: Number(parcelle.price),
          tauxSansRisque: parcelle.tauxSansRisque !== null ? Number(parcelle.tauxSansRisque) : 0.02,
          volatilite: parcelle.volatilite !== null ? Number(parcelle.volatilite) : 0.06,
          fraisMutation: parcelle.fraisMutation !== null ? Number(parcelle.fraisMutation) : 0.20,
          tauxActuariel: parcelle.tauxActuariel !== null ? Number(parcelle.tauxActuariel) : 0.035,
          fraisGestion: parcelle.fraisGestion !== null ? Number(parcelle.fraisGestion) : 0.05,
          fraisAcquisition: parcelle.fraisAcquisition !== null ? Number(parcelle.fraisAcquisition) : 0.03,
        },
        client: {
          dureeAnnees: options.durationYears,
          age: age,
          frequencePaiement: options.frequency as FrequencePaiement,
          priseEnChargeFraisMutation: false,
          garantieDeces: options.garantieDeces,
          verse_init: options.verseInit,
        },
      });
    } catch (err: any) {
      return NextResponse.json(
        {
          success: false,
          error: "SIMULATION_ERROR",
          message: err.message || "Erreur de simulation de la prime d'assurance.",
        },
        { status: 400 }
      );
    }

    // 5. Générer une référence unique de police
    const contractRef = `CTR-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const durationMonths = options.durationYears * 12;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);

    // 6. Insérer en base de données sous transaction
    const result = await prisma.$transaction(async (tx) => {
      // a. Créer le contrat
      const contract = await tx.contract.create({
        data: {
          reference: contractRef,
          totalAmount: simulation.coutTotalEstime,
          status: "DRAFT",
          periodicity: FREQUENCY_MAP[options.frequency],
          installmentAmount: simulation.primeParEcheance,
          startDate,
          endDate,
          durationMonths,
          verseInit: options.verseInit,
          garantieDeces: options.garantieDeces,
          subscriberSignatureUrl: options.signature || null,
          userId: targetUserId,
          parcelleId: parcelle.id,
          companyId: targetUser.companyId,
          agencyId,
        },
      });

      // b. Créer l'assuré
      const contractInsured = await tx.contractInsured.create({
        data: {
          contractId: contract.id,
          fullName: insured.fullName,
          birthDate: birthDate,
          phone: insured.phone || null,
          email: insured.email || null,
          address: insured.address || null,
          relationship: insured.relationship,
          netPremium: simulation.coutTotalEstime - (options.verseInit || 0), // pure premium
          totalPremium: simulation.coutTotalEstime,
        },
      });

      // c. Créer le ou les bénéficiaires
      if (beneficiaryTerm) {
        await tx.insuredBeneficiary.create({
          data: {
            contractInsuredId: contractInsured.id,
            fullName: beneficiaryTerm.fullName,
            relationship: `Terme - ${beneficiaryTerm.relationship}`,
            birthDate: beneficiaryTerm.birthDate ? new Date(beneficiaryTerm.birthDate) : null,
            sharePercentage: 100,
            phone: beneficiaryTerm.phone || null,
            email: beneficiaryTerm.email || null,
          },
        });
      }

      if (beneficiaryDeath) {
        await tx.insuredBeneficiary.create({
          data: {
            contractInsuredId: contractInsured.id,
            fullName: beneficiaryDeath.fullName,
            relationship: `Décès - ${beneficiaryDeath.relationship}`,
            birthDate: beneficiaryDeath.birthDate ? new Date(beneficiaryDeath.birthDate) : null,
            sharePercentage: 100,
            phone: beneficiaryDeath.phone || null,
            email: beneficiaryDeath.email || null,
          },
        });
      }

      if (!beneficiaryTerm && !beneficiaryDeath && beneficiary) {
        await tx.insuredBeneficiary.create({
          data: {
            contractInsuredId: contractInsured.id,
            fullName: beneficiary.fullName,
            relationship: beneficiary.relationship,
            birthDate: beneficiary.birthDate ? new Date(beneficiary.birthDate) : null,
            sharePercentage: beneficiary.sharePercentage || 100,
            phone: beneficiary.phone || null,
            email: beneficiary.email || null,
          },
        });
      }

      // d. Créer l'intention d'achat (Reservation) au statut PENDING
      const reservation = await tx.reservation.create({
        data: {
          parcelleId: parcelle.id,
          userId: targetUserId,
          contractId: contract.id,
          status: "PENDING",
        },
      });

      return { contract, reservation };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Dossier de souscription et intention d'achat enregistrés avec succès.",
    });
  } catch (err: any) {
    console.error("Erreur API Souscription:", err);
    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: "Une erreur interne s'est produite lors de l'enregistrement de la souscription.",
      },
      { status: 500 }
    );
  }
}
