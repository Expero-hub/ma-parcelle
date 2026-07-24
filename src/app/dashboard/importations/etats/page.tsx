import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { EtatsClient } from "./etats-client";

export default async function EtatsPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  await requirePermission("read");

  const params = await searchParams;
  const startDate = params.startDate || "";
  const endDate = params.endDate || "";

  let encaissements: any[] = [];
  if (startDate && endDate) {
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const dbPayments = await prisma.payment.findMany({
        where: {
          deletedAt: null,
          paymentDate: {
            gte: start,
            lte: end,
          },
        },
        include: {
          installment: {
            include: {
              contract: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
        orderBy: { paymentDate: "asc" },
      });

      encaissements = dbPayments.map((p) => {
      const clientName = p.installment?.contract?.user?.name || "John Doe";
      const contractRef = p.installment?.contract?.reference || "CNT001";
      const emissionRef = p.installment?.reference || "Emi10001";
      const amount = Number(p.amount);

      const contractStart = p.installment?.contract?.startDate
        ? new Date(p.installment.contract.startDate).toISOString().slice(0, 10)
        : "";
      const contractEnd = p.installment?.contract?.endDate
        ? new Date(p.installment.contract.endDate).toISOString().slice(0, 10)
        : "";

      const paymentDateFormatted = new Date(p.paymentDate).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const contractStartFormatted = p.installment?.contract?.startDate
        ? new Date(p.installment.contract.startDate).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "";

      const contractEndFormatted = p.installment?.contract?.endDate
        ? new Date(p.installment.contract.endDate).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "";

      return {
        id: p.id,
        paymentDateRaw: new Date(p.paymentDate).toISOString().slice(0, 10),
        paymentDateFormatted,
        amount,
        contractRef,
        contractStart,
        contractStartFormatted,
        contractEnd,
        contractEndFormatted,
        emissionRef,
        emissionAmount: Number(p.installment?.amount || p.amount),
        clientName,
      };
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des états des encaissements:", error);
  }
}

  return (
    <EtatsClient
      initialEncaissements={encaissements}
      defaultStartDate={startDate}
      defaultEndDate={endDate}
    />
  );
}
