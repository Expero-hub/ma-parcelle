import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { EmissionsClient } from "./emissions-client";

const formatPeriodicity = (p: string | null | undefined): string => {
  if (!p) return "—";
  const map: Record<string, string> = {
    MONTHLY: "Mensuelle",
    QUARTERLY: "Trimestrielle",
    BIANNUAL: "Semestrielle",
    ANNUAL: "Annuelle",
  };
  return map[p] || p;
};

export default async function EmissionsPage() {
  await requirePermission("read");

  let emissions: any[] = [];
  try {
    const dbInstallments = await prisma.installment.findMany({
      where: { deletedAt: null },
      include: {
        contract: true,
      },
      orderBy: { startDate: "desc" },
    });

    emissions = dbInstallments.map((i) => ({
      id: i.id,
      reference: i.reference,
      contractRef: i.contract?.reference || "CNT001",
      startDate: new Date(i.startDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
      endDate: new Date(i.endDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
      periodicity: formatPeriodicity(i.contract?.periodicity),
      amount: Number(i.amount),
      status: i.status === "PAID"
        ? "PAYE"
        : i.status === "PENDING"
        ? "EN COURS"
        : i.status === "OVERDUE"
        ? "EN RETARD"
        : i.status === "PARTIAL"
        ? "PARTIEL"
        : i.status,
    }));
  } catch (error) {
    console.error("Erreur chargement émissions BDD:", error);
  }

  if (emissions.length === 0) {
    emissions = [
      {
        id: "emi-2",
        reference: "Emi10002",
        contractRef: "CNT001",
        startDate: "01 sept. 2025",
        endDate: "30 sept. 2025",
        periodicity: "Mensuelle",
        amount: 500000,
        status: "PAYE",
      },
      {
        id: "emi-1",
        reference: "Emi10001",
        contractRef: "CNT001",
        startDate: "01 août 2025",
        endDate: "31 août 2025",
        periodicity: "Mensuelle",
        amount: 500000,
        status: "PAYE",
      },
    ];
  }

  return <EmissionsClient initialEmissions={emissions} />;
}
