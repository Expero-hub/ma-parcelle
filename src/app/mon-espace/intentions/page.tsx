import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { IntentionsTable, type IntentionItem } from "./_components/intentions-table";

export default async function IntentionsPage() {
  const user = await requireUser();

  const dbReservations = await prisma.reservation.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
    },
    include: {
      parcelle: {
        include: {
          zone: true,
        },
      },
      contract: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const intentions: IntentionItem[] = dbReservations.map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    parcelle: {
      reference: r.parcelle.reference,
      commune: r.parcelle.zone?.commune,
      department: r.parcelle.zone?.department,
    },
    contract: r.contract
      ? {
          reference: r.contract.reference,
          totalAmount: Number(r.contract.totalAmount),
          periodicity: r.contract.periodicity,
        }
      : null,
  }));

  return (
    <div className="p-6 md:p-8">
      <IntentionsTable initialIntentions={intentions} />
    </div>
  );
}
