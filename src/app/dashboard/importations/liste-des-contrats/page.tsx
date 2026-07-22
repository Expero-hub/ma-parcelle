import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { ContratsClient } from "./contrats-client";

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

export default async function ContratsPage() {
  await requirePermission("read");

  let contracts: any[] = [];
  let agencies: any[] = [];
  try {
    const [dbContracts, dbAgencies] = await Promise.all([
      prisma.contract.findMany({
        where: { deletedAt: null },
        include: {
          user: true,
          agency: true,
          company: true,
          parcelle: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.agency.findMany({
        where: { deletedAt: null, active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    ]);

    agencies = dbAgencies;

    contracts = dbContracts.map((c) => ({
      id: c.id,
      reference: c.reference,
      clientName: c.user?.name || "John Doe",
      clientEmail: c.user?.email || "perodev10@gmail.com",
      clientPhone: c.user?.phone || "0123456789",
      periodicity: formatPeriodicity(c.periodicity),
      prime: Number(c.totalAmount || c.installmentAmount || 500000),
      startDate: c.startDate ? new Date(c.startDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—",
      endDate: c.endDate ? new Date(c.endDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—",
      agencyId: c.agencyId,
      agencyName: c.agency?.name || "—",
      companyName: c.company?.name || "—",
      status: c.status === "ACTIVE"
        ? "EN COURS"
        : c.status === "DRAFT"
        ? "BROUILLON"
        : c.status === "COMPLETED"
        ? "TERMINE"
        : c.status === "CANCELLED"
        ? "ANNULE"
        : c.status,
      isActive: c.isValidated || c.status === "ACTIVE",
    }));
  } catch (error) {
    console.error("Erreur chargement contrats BDD:", error);
  }

  if (contracts.length === 0) {
    contracts = [
      {
        id: "cnt-1",
        reference: "CNT001",
        clientName: "John Doe",
        clientEmail: "perodev10@gmail.com",
        clientPhone: "0123456789",
        periodicity: "Mensuelle",
        prime: 500000,
        startDate: "04 juil. 2025",
        endDate: "04 juin 2030",
        agencyId: "default-agency",
        agencyName: "Agence de Menontin",
        companyName: "—",
        status: "EN COURS",
        isActive: true,
      },
    ];
  }

  return <ContratsClient initialContracts={contracts} agencies={agencies} />;
}
