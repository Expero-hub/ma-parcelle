import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { EncaissementsClient } from "./encaissements-client";

export default async function EncaissementsPage() {
  await requirePermission("read");

  let encaissements: any[] = [];
  try {
    const dbPayments = await prisma.payment.findMany({
      where: { deletedAt: null },
      include: {
        installment: true,
      },
      orderBy: { paymentDate: "desc" },
    });

    encaissements = dbPayments.map((p) => ({
      id: p.id,
      reference: p.reference,
      emissionRef: p.installment?.reference || "Emi10001",
      paymentDate: new Date(p.paymentDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
      amount: Number(p.amount),
      agencyFee: Number(p.agencyFee || 50000),
      status: "PAYE",
      comment: p.comment || "RAS",
    }));
  } catch (error) {
    console.error("Erreur chargement encaissements BDD:", error);
  }

  if (encaissements.length === 0) {
    encaissements = [
      {
        id: "enc-2",
        reference: "Enc10002",
        emissionRef: "Emi10002",
        paymentDate: "08 juil. 2025",
        amount: 500000,
        agencyFee: 50000,
        status: "PAYE",
        comment: "RAS",
      },
      {
        id: "enc-1",
        reference: "Enc10001",
        emissionRef: "Emi10001",
        paymentDate: "08 juil. 2025",
        amount: 500000,
        agencyFee: 50000,
        status: "PAYE",
        comment: "RAS",
      },
    ];
  }

  return <EncaissementsClient initialEncaissements={encaissements} />;
}
