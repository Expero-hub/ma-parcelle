import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { IntentionsList } from "./_components/intentions-list";

export default async function IntentionsPage() {
  await requirePermission("read");

  const pendingReservations = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      deletedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      parcelle: {
        include: {
          zone: true,
        },
      },
      contract: {
        include: {
          installments: {
            where: { deletedAt: null },
            include: {
              payments: {
                where: { deletedAt: null },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const items = pendingReservations.map((res) => {
    let totalPaid = 0;
    const contract = res.contract;
    if (contract) {
      for (const inst of contract.installments) {
        for (const pay of inst.payments) {
          totalPaid += Number(pay.amount);
        }
      }
    }

    const totalAmount = contract ? Number(contract.totalAmount) : 0;
    const durationMonths = contract ? contract.durationMonths : 84;
    const annualPremium = (totalAmount * 12) / durationMonths;
    const threshold2Primes = 2 * annualPremium;
    const threshold15Percent = 0.15 * totalAmount;
    const isEligible = totalPaid >= threshold2Primes || totalPaid >= threshold15Percent;

    return {
      id: res.id,
      createdAt: res.createdAt.toISOString(),
      user: {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        phone: res.user.phone || "—",
      },
      parcelle: {
        id: res.parcelle.id,
        reference: res.parcelle.reference,
        commune: res.parcelle.zone?.commune || "Bénin",
        price: Number(res.parcelle.price),
      },
      contract: contract ? {
        id: contract.id,
        reference: contract.reference,
        totalAmount: totalAmount,
        installmentAmount: contract.installmentAmount ? Number(contract.installmentAmount) : 0,
        periodicity: contract.periodicity,
        durationMonths: contract.durationMonths,
        verseInit: contract.verseInit ? Number(contract.verseInit) : 0,
        garantieDeces: contract.garantieDeces,
      } : null,
      totalPaid,
      isEligible,
      minRequired: Math.min(threshold2Primes, threshold15Percent),
    };
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Intentions d'achat</h1>
          <p className="text-sm text-text-2 mt-1">
            Gérez et validez les demandes d'acquisition soumises par les clients.
          </p>
        </div>
      </div>

      <IntentionsList initialItems={items} />
    </div>
  );
}
