import { NextResponse } from "next/server";
import { Periodicity } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  parseFileFromRequest,
  buildImportSummary,
  parseAmount,
  parseDate,
  normalizeString,
  type RowResult,
} from "@/lib/imports/import-helpers";
import { saveImportedFile } from "@/lib/imports/save-import";

const PERIODICITY_MAP: Record<string, Periodicity> = {
  M: Periodicity.MONTHLY,
  MENSUELLE: Periodicity.MONTHLY,
  T: Periodicity.QUARTERLY,
  TRIMESTRIELLE: Periodicity.QUARTERLY,
  S: Periodicity.BIANNUAL,
  SEMESTRIELLE: Periodicity.BIANNUAL,
  A: Periodicity.ANNUAL,
  ANNUELLE: Periodicity.ANNUAL,
};

export async function POST(req: Request) {
  // 1. Contrôle des autorisations
  const user = await requirePermission("create");

  // 2. Extrait les données du fichier
  const { headerMap, dataRows, errorResponse, file } = await parseFileFromRequest(req);
  if (errorResponse) {
    return NextResponse.json(errorResponse, { status: 400 });
  }

  // 3. Vérification des en-têtes obligatoires
  const requiredHeaders = [
    "CONTRAT",
    "PERIODICITE",
    "MONTANT",
    "EMAIL CLIENT",
    "DATE DE DEBUT",
    "DATE DE FIN",
    "AGENCE",
  ];

  const missingHeaders = requiredHeaders.filter((h) => !headerMap.has(h));
  if (missingHeaders.length > 0) {
    return NextResponse.json(
      {
        success: false,
        summary: { total: 0, created: 0, skipped: 0, errors: 0 },
        rows: [],
        message: `Colonnes obligatoires manquantes dans le fichier : ${missingHeaders.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const idxContrat = headerMap.get("CONTRAT")!;
  const idxPeriodicite = headerMap.get("PERIODICITE")!;
  const idxMontant = headerMap.get("MONTANT")!;
  const idxMontantPeriodique = headerMap.get("MONTANT PERIODIQUE");
  const idxEmailClient = headerMap.get("EMAIL CLIENT")!;
  const idxDateDebut = headerMap.get("DATE DE DEBUT")!;
  const idxDateFin = headerMap.get("DATE DE FIN")!;
  const idxParcelle = headerMap.get("PARCELLE");
  const idxAgence = headerMap.get("AGENCE")!;
  const idxCompagnie = headerMap.get("COMPAGNIE") ?? headerMap.get("COMPAGNIE D'ASSURANCE");

  const results: RowResult[] = [];
  const createdContractRefs: string[] = [];

  // 4. Traitement ligne par ligne
  for (let i = 0; i < dataRows.length; i++) {
    const rowLineNumber = i + 1; // 1-indexed (1er enregistrement sous l'en-tête)
    const row = dataRows[i] || [];

    // Ignorer les lignes totalement vides
    if (row.every((cell) => cell === "" || cell === null || cell === undefined)) {
      continue;
    }

    const contratRef = String(row[idxContrat] || "").trim();
    if (!contratRef) {
      results.push({
        line: rowLineNumber,
        status: "error",
        message: "La référence CONTRAT est obligatoire.",
      });
      continue;
    }

    try {
      // a. Anti-doublon
      const existingContract = await prisma.contract.findUnique({
        where: { reference: contratRef },
      });

      if (existingContract) {
        results.push({
          line: rowLineNumber,
          status: "skipped",
          reference: contratRef,
          message: `Contrat ${contratRef} déjà existant.`,
        });
        continue;
      }

      // b. Périodicité
      const rawPeriodicite = String(row[idxPeriodicite] || "").trim().toUpperCase();
      const periodicity = PERIODICITY_MAP[rawPeriodicite];
      if (!periodicity) {
        results.push({
          line: rowLineNumber,
          status: "error",
          reference: contratRef,
          message: `Périodicité '${rawPeriodicite}' invalide. Valeurs acceptées : M, MENSUELLE, T, TRIMESTRIELLE, S, SEMESTRIELLE, A, ANNUELLE.`,
        });
        continue;
      }

      // c. Montants
      const totalAmount = parseAmount(row[idxMontant]);
      if (totalAmount === null || totalAmount <= 0) {
        results.push({
          line: rowLineNumber,
          status: "error",
          reference: contratRef,
          message: "Montant total (MONTANT) invalide ou négatif.",
        });
        continue;
      }

      const installmentAmount = idxMontantPeriodique !== undefined ? parseAmount(row[idxMontantPeriodique]) : null;

      // d. Client
      const clientEmail = String(row[idxEmailClient] || "").trim();
      if (!clientEmail) {
        results.push({
          line: rowLineNumber,
          status: "error",
          reference: contratRef,
          message: "L'EMAIL CLIENT est obligatoire.",
        });
        continue;
      }

      const user = await prisma.user.findUnique({
        where: { email: clientEmail },
      });

      if (!user) {
        results.push({
          line: rowLineNumber,
          status: "error",
          reference: contratRef,
          message: `Client introuvable pour l'email '${clientEmail}'.`,
        });
        continue;
      }

      // e. Dates
      const startDate = parseDate(row[idxDateDebut]);
      const endDate = parseDate(row[idxDateFin]);

      if (!startDate || !endDate) {
        results.push({
          line: rowLineNumber,
          status: "error",
          reference: contratRef,
          message: "La DATE DE DEBUT ou la DATE DE FIN est invalide.",
        });
        continue;
      }

      // f. Agence (Obligatoire)
      const agenceCol = String(row[idxAgence] || "").trim();
      if (!agenceCol) {
        results.push({
          line: rowLineNumber,
          status: "error",
          reference: contratRef,
          message: "L'AGENCE est obligatoire.",
        });
        continue;
      }

      const agency = await prisma.agency.findFirst({
        where: { name: { equals: agenceCol, mode: "insensitive" }, deletedAt: null },
      });

      if (!agency) {
        results.push({
          line: rowLineNumber,
          status: "error",
          reference: contratRef,
          message: `Agence '${agenceCol}' introuvable dans la base de données.`,
        });
        continue;
      }

      // g. Parcelle (Optionnelle)
      const warnings: string[] = [];
      let parcelleId: string | null = null;

      const parcelleRef = idxParcelle !== undefined ? String(row[idxParcelle] || "").trim() : "";
      if (parcelleRef) {
        const parcelle = await prisma.parcelle.findUnique({
          where: { reference: parcelleRef },
          include: {
            pointOfSale: {
              include: {
                agency: true,
              },
            },
          },
        });

        if (!parcelle) {
          results.push({
            line: rowLineNumber,
            status: "error",
            reference: contratRef,
            message: `Parcelle introuvable pour la référence '${parcelleRef}'.`,
          });
          continue;
        }

        parcelleId = parcelle.id;

        // Contrôle de cohérence d'agence
        const actualAgencyName = parcelle.pointOfSale?.agency?.name;
        if (actualAgencyName && normalizeString(agenceCol) !== normalizeString(actualAgencyName)) {
          warnings.push(
            `Incohérence d'agence : la parcelle appartient à l'agence '${actualAgencyName}' mais le contrat est lié à l'agence '${agenceCol}'.`,
          );
        }
      }

      // h. Compagnie (Optionnelle)
      let companyId: string | null = null;
      if (idxCompagnie !== undefined && row[idxCompagnie] !== undefined && row[idxCompagnie] !== "") {
        const companyName = String(row[idxCompagnie]).trim();
        const company = await prisma.company.findFirst({
          where: { name: { equals: companyName, mode: "insensitive" }, deletedAt: null },
        });
        if (!company) {
          warnings.push(`Compagnie '${companyName}' introuvable. Le contrat sera créé sans compagnie.`);
        } else {
          companyId = company.id;
        }
      }

      // i. Création du contrat
      await prisma.contract.create({
        data: {
          reference: contratRef,
          totalAmount,
          periodicity,
          installmentAmount: installmentAmount ?? null,
          startDate,
          endDate,
          status: "DRAFT",
          isValidated: false,
          userId: user.id,
          parcelleId,
          agencyId: agency.id,
          companyId,
        },
      });

      createdContractRefs.push(contratRef);

      results.push({
        line: rowLineNumber,
        status: "created",
        reference: contratRef,
        ...(warnings.length > 0 ? { warnings } : {}),
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Erreur inconnue lors de la création.";
      results.push({
        line: rowLineNumber,
        status: "error",
        reference: contratRef,
        message: `Échec du traitement de la ligne : ${errMsg}`,
      });
    }
  }

  const summary = buildImportSummary(results);

  if (file && summary.total > 0 && user) {
    const importFile = await saveImportedFile({
      file,
      type: "contrat",
      userId: user.id,
      processedRows: summary.created + summary.skipped,
      errorRows: summary.errors,
    });

    if (importFile && createdContractRefs.length > 0) {
      await prisma.contract.updateMany({
        where: { reference: { in: createdContractRefs } },
        data: { fileId: importFile.id },
      });
    }
  }

  return NextResponse.json({
    success: true,
    summary,
    rows: results,
  });
}
