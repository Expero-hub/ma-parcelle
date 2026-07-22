import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { ContratsTable, type ContractItem } from "./_components/contrats-table";

export default async function ContratsPage() {
  const user = await requireUser();

  const dbContracts = await prisma.contract.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
    },
    include: {
      company: true,
      agency: true,
      parcelle: {
        include: {
          zone: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const contracts: ContractItem[] = dbContracts.map((c) => ({
    id: c.id,
    reference: c.reference,
    totalAmount: Number(c.totalAmount),
    status: c.status,
    periodicity: c.periodicity,
    installmentAmount: c.installmentAmount ? Number(c.installmentAmount) : null,
    startDate: c.startDate ? c.startDate.toISOString() : null,
    endDate: c.endDate ? c.endDate.toISOString() : null,
    parcelle: {
      reference: c.parcelle?.reference || "—",
      commune: c.parcelle?.zone?.commune || "—",
      companyName: c.company?.name || "—",
      agencyName: c.agency?.name || "—",
    },
  }));

  return (
    <div className="p-6 md:p-8">
      <ContratsTable initialContracts={contracts} />
    </div>
  );
}
