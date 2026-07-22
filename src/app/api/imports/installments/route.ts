import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  parseFileFromRequest,
  buildImportSummary,
  parseAmount,
  parseDate,
  type RowResult,
} from "@/lib/imports/import-helpers";

export async function POST(req: Request) {
  // 1. Contrôle des autorisations
  await requirePermission("create");

  // 2. Extrait les données du fichier
  const { headerMap, dataRows, errorResponse } = await parseFileFromRequest(req);
  if (errorResponse) {
    return NextResponse.json(errorResponse, { status: 400 });
  }

  // 3. Vérification des en-têtes obligatoires
  const requiredHeaders = ["EMISSION", "CONTRAT", "DATE DE DEBUT", "DATE DE FIN", "MONTANT"];
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

  const idxEmission = headerMap.get("EMISSION")!;
  const idxContrat = headerMap.get("CONTRAT")!;
  const idxDateDebut = headerMap.get("DATE DE DEBUT")!;
  const idxDateFin = headerMap.get("DATE DE FIN")!;
  const idxMontant = headerMap.get("MONTANT")!;

  const results: RowResult[] = [];

  // 4. Traitement ligne par ligne
  for (let i = 0; i < dataRows.length; i++) {
    const rowLineNumber = i + 1;
    const row = dataRows[i] || [];

    if (row.every((cell) => cell === "" || cell === null || cell === undefined)) {
      continue;
    }

    const emissionRef = String(row[idxEmission] || "").trim();
    if (!emissionRef) {
      results.push({
        line: rowLineNumber,
        status: "error",
        message: "La référence EMISSION est obligatoire.",
      });
      continue;
    }

    try {
      // a. Anti-doublon sur l'échéance / émission
      const existingInstallment = await prisma.installment.findUnique({
        where: { reference: emissionRef },
      });

      if (existingInstallment) {
        results.push({
          line: rowLineNumber,
          status: "skipped",
          reference: emissionRef,
          message: `Échéance ${emissionRef} déjà existante.`,
        });
        continue;
      }

      // b. Contrat parent
      const contratRef = String(row[idxContrat] || "").trim();
      if (!contratRef) {
        results.push({
          line: rowLineNumber,
          status: "error",
          reference: emissionRef,
          message: "La référence CONTRAT est obligatoire.",
        });
        continue;
      }

      const contract = await prisma.contract.findUnique({
        where: { reference: contratRef },
      });

      if (!contract) {
        results.push({
          line: rowLineNumber,
          status: "error",
          reference: emissionRef,
          message: `Contrat '${contratRef}' introuvable.`,
        });
        continue;
      }

      // c. Dates
      const startDate = parseDate(row[idxDateDebut]);
      const endDate = parseDate(row[idxDateFin]);

      if (!startDate || !endDate) {
        results.push({
          line: rowLineNumber,
          status: "error",
          reference: emissionRef,
          message: "La DATE DE DEBUT ou la DATE DE FIN est invalide.",
        });
        continue;
      }

      // d. Montant
      const amount = parseAmount(row[idxMontant]);
      if (amount === null || amount <= 0) {
        results.push({
          line: rowLineNumber,
          status: "error",
          reference: emissionRef,
          message: "Le MONTANT de l'émission est invalide ou négatif.",
        });
        continue;
      }

      // e. Contrôle de cohérence des dates par rapport au contrat parent
      const warnings: string[] = [];
      if (contract.startDate && startDate < contract.startDate) {
        warnings.push(
          `La date de début de l'émission (${startDate.toLocaleDateString("fr-FR")}) est antérieure à la date de début du contrat (${contract.startDate.toLocaleDateString("fr-FR")}).`
        );
      }
      if (contract.endDate && endDate > contract.endDate) {
        warnings.push(
          `La date de fin de l'émission (${endDate.toLocaleDateString("fr-FR")}) est postérieure à la date de fin du contrat (${contract.endDate.toLocaleDateString("fr-FR")}).`
        );
      }

      // f. Création de l'échéance (Installment)
      await prisma.installment.create({
        data: {
          reference: emissionRef,
          startDate,
          endDate,
          amount,
          status: "PENDING",
          contractId: contract.id,
        },
      });

      results.push({
        line: rowLineNumber,
        status: "created",
        reference: emissionRef,
        ...(warnings.length > 0 ? { warnings } : {}),
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Erreur inconnue lors de la création.";
      results.push({
        line: rowLineNumber,
        status: "error",
        reference: emissionRef,
        message: `Échec du traitement de la ligne : ${errMsg}`,
      });
    }
  }

  const summary = buildImportSummary(results);

  return NextResponse.json({
    success: true,
    summary,
    rows: results,
  });
}
