import { NextResponse } from "next/server";
import { InstallmentStatus } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  parseFileFromRequest,
  buildImportSummary,
  parseAmount,
  parseDate,
  type RowResult,
} from "@/lib/imports/import-helpers";
import { saveImportedFile } from "@/lib/imports/save-import";

export async function POST(req: Request) {
  // 1. Contrôle des autorisations
  const user = await requirePermission("create");

  // 2. Extrait les données du fichier
  const { headerMap, dataRows, errorResponse, file } = await parseFileFromRequest(req);
  if (errorResponse) {
    return NextResponse.json(errorResponse, { status: 400 });
  }

  // 3. Vérification des en-têtes obligatoires
  const requiredHeaders = ["ENCAISSEMENT", "EMISSION", "DATE DE L'ENCAISSEMENT", "MONTANT"];
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

  const idxEncaissement = headerMap.get("ENCAISSEMENT")!;
  const idxEmission = headerMap.get("EMISSION")!;
  const idxDateEncaissement = headerMap.get("DATE DE L'ENCAISSEMENT")!;
  const idxMontant = headerMap.get("MONTANT")!;
  const idxObservation = headerMap.get("OBSERVATION");

  const results: RowResult[] = [];
  const createdPaymentRefs: string[] = [];
  const impactedInstallmentIds = new Set<string>();

  // 4. Traitement ligne par ligne
  for (let i = 0; i < dataRows.length; i++) {
    const rowLineNumber = i + 1;
    const row = dataRows[i] || [];

    if (row.every((cell) => cell === "" || cell === null || cell === undefined)) {
      continue;
    }

    const paymentRef = String(row[idxEncaissement] || "").trim();
    const emissionRef = String(row[idxEmission] || "").trim();

    if (!paymentRef) {
      results.push({
        line: rowLineNumber,
        status: "error",
        message: "La référence ENCAISSEMENT est obligatoire.",
      });
      continue;
    }

    if (!emissionRef) {
      results.push({
        line: rowLineNumber,
        status: "error",
        message: "La référence EMISSION est obligatoire.",
      });
      continue;
    }

    try {
      // a. Anti-doublon sur la référence de l'encaissement
      const existingPayment = await prisma.payment.findUnique({
        where: { reference: paymentRef },
      });

      if (existingPayment) {
        results.push({
          line: rowLineNumber,
          status: "skipped",
          reference: paymentRef,
          message: `Encaissement ${paymentRef} déjà existant.`,
        });
        continue;
      }

      // b. Échéance parent
      const installment = await prisma.installment.findUnique({
        where: { reference: emissionRef },
      });

      if (!installment) {
        results.push({
          line: rowLineNumber,
          status: "error",
          reference: paymentRef,
          message: `Échéance '${emissionRef}' introuvable.`,
        });
        continue;
      }

      // c. Date d'encaissement
      const paymentDate = parseDate(row[idxDateEncaissement]);
      if (!paymentDate) {
        results.push({
          line: rowLineNumber,
          status: "error",
          reference: paymentRef,
          message: "La DATE DE L'ENCAISSEMENT est invalide.",
        });
        continue;
      }

      // d. Montant
      const amount = parseAmount(row[idxMontant]);
      if (amount === null || amount <= 0) {
        results.push({
          line: rowLineNumber,
          status: "error",
          reference: paymentRef,
          message: "Le MONTANT de l'encaissement est invalide ou négatif.",
        });
        continue;
      }

      // e. Observation / commentaire
      const comment = idxObservation !== undefined && row[idxObservation] !== undefined
        ? String(row[idxObservation]).trim() || null
        : null;

      // f. Contrôle de cohérence du paiement par rapport à l'échéance parent
      const warnings: string[] = [];
      const aggregate = await prisma.payment.aggregate({
        where: { installmentId: installment.id, deletedAt: null },
        _sum: { amount: true },
      });
      const totalPaidSoFar = Number(aggregate._sum.amount || 0);
      const installmentAmount = Number(installment.amount);

      if (totalPaidSoFar + amount > installmentAmount) {
        warnings.push(
          `Sur-paiement détecté : le montant total payé (${(totalPaidSoFar + amount).toLocaleString("fr-FR")} FCFA) dépasse le montant attendu de l'échéance (${installmentAmount.toLocaleString("fr-FR")} FCFA).`
        );
      }
      if (installment.endDate && paymentDate > installment.endDate) {
        warnings.push(
          `Date tardive : la date de l'encaissement (${paymentDate.toLocaleDateString("fr-FR")}) est postérieure à la date d'échéance (${installment.endDate.toLocaleDateString("fr-FR")}).`
        );
      }

      // g. Création du paiement
      await prisma.payment.create({
        data: {
          reference: paymentRef,
          amount,
          paymentDate,
          comment,
          agencyFee: null,
          installmentId: installment.id,
        },
      });

      createdPaymentRefs.push(paymentRef);
      impactedInstallmentIds.add(installment.id);

      results.push({
        line: rowLineNumber,
        status: "created",
        reference: paymentRef,
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

  // 5. Recalcul du statut de chaque Installment impactée
  const now = new Date();
  for (const installmentId of impactedInstallmentIds) {
    try {
      const inst = await prisma.installment.findUnique({
        where: { id: installmentId },
      });

      if (!inst) continue;

      const aggregate = await prisma.payment.aggregate({
        where: { installmentId, deletedAt: null },
        _sum: { amount: true },
      });

      const totalPaid = Number(aggregate._sum.amount || 0);
      const instAmount = Number(inst.amount);

      let newStatus: InstallmentStatus = InstallmentStatus.PENDING;

      if (totalPaid >= instAmount) {
        newStatus = InstallmentStatus.PAID;
      } else if (inst.endDate < now && totalPaid < instAmount) {
        newStatus = InstallmentStatus.OVERDUE;
      } else if (totalPaid > 0 && totalPaid < instAmount) {
        newStatus = InstallmentStatus.PARTIAL;
      } else {
        newStatus = InstallmentStatus.PENDING;
      }

      if (inst.status !== newStatus) {
        await prisma.installment.update({
          where: { id: installmentId },
          data: { status: newStatus },
        });
      }
    } catch (err) {
      console.error(`Erreur lors du recalcul du statut pour l'échéance ${installmentId}:`, err);
    }
  }

  const summary = buildImportSummary(results);

  if (file && summary.total > 0 && user) {
    const importFile = await saveImportedFile({
      file,
      type: "encaissement",
      userId: user.id,
      processedRows: summary.created + summary.skipped,
      errorRows: summary.errors,
    });

    if (importFile && createdPaymentRefs.length > 0) {
      await prisma.payment.updateMany({
        where: { reference: { in: createdPaymentRefs } },
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
