import { getCurrentUser, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { fmtFCFA } from "@/lib/parcelles";
import { CreditCard, Bookmark, Grid, MapPin, ArrowUpRight, Calendar } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  await requirePermission();
  const user = await getCurrentUser();

  // 1. Query real statistics from database
  const totalParcellesCount = await prisma.parcelle.count({ where: { deletedAt: null } });
  const availableParcellesCount = await prisma.parcelle.count({
    where: { status: "AVAILABLE", deletedAt: null },
  });
  const reservedParcellesCount = await prisma.parcelle.count({
    where: { status: "RESERVED", deletedAt: null },
  });

  const totalAreaResult = await prisma.parcelle.aggregate({
    _sum: { area: true },
    where: { deletedAt: null },
  });
  const totalAreaHectares = (Number(totalAreaResult._sum.area || 0) / 10000).toFixed(1);

  const activeContractsSum = await prisma.contract.aggregate({
    _sum: { totalAmount: true },
    where: { status: { in: ["ACTIVE", "COMPLETED"] }, deletedAt: null },
  });
  const totalSales = Number(activeContractsSum._sum.totalAmount || 0);

  // Compute stock percentage
  const stockPercentage =
    totalParcellesCount > 0
      ? ((availableParcellesCount / totalParcellesCount) * 100).toFixed(1)
      : "0.0";

  // 2. Query payments for the last 6 months for the performance chart
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const payments = await prisma.payment.findMany({
    where: {
      paymentDate: { gte: sixMonthsAgo },
      deletedAt: null,
    },
    select: {
      amount: true,
      paymentDate: true,
    },
  });

  const monthlyData = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5 + idx);
    const monthName = d.toLocaleDateString("fr-FR", { month: "short" });
    const year = d.getFullYear();
    return {
      label: `${monthName} ${year.toString().slice(-2)}`,
      month: d.getMonth(),
      year: d.getFullYear(),
      amount: 0,
    };
  });

  payments.forEach((p) => {
    const pDate = new Date(p.paymentDate);
    const match = monthlyData.find(
      (m) => m.month === pDate.getMonth() && m.year === pDate.getFullYear()
    );
    if (match) {
      match.amount += Number(p.amount);
    }
  });

  const maxAmount = Math.max(...monthlyData.map((m) => m.amount), 1);

  // 3. Query recent activity (last 5 payments)
  const recentPayments = await prisma.payment.findMany({
    take: 5,
    orderBy: { paymentDate: "desc" },
    where: { deletedAt: null },
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
  });

  return (
    <div className="flex flex-col flex-1 gap-6 p-6 md:p-8">
      {/* Header Section */}
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-text">
          Bonjour, {user?.name}
        </h1>
        <p className="mt-1 font-sans text-sm text-text-2">
          Bienvenue sur votre tableau de bord. Voici un aperçu de vos activités.
        </p>
      </div>

      {/* Grid containing 4 stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Vente Totale */}
        <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-[var(--shadow)] hover:shadow-[var(--shadow-hover)] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-semibold text-text-2 uppercase tracking-wider">
              Vente Totale
            </span>
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <CreditCard className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl font-bold text-text leading-none">
              {fmtFCFA(totalSales)} FCFA
            </div>
            <p className="mt-2 font-sans text-xs text-primary font-semibold flex items-center gap-1">
              <span>Encaissements de contrats actifs</span>
            </p>
          </div>
        </div>

        {/* Card 2: Parcelles Réservées */}
        <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-[var(--shadow)] hover:shadow-[var(--shadow-hover)] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-semibold text-text-2 uppercase tracking-wider">
              Parcelles Réservées
            </span>
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Bookmark className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl font-bold text-text leading-none">
              {reservedParcellesCount}
            </div>
            <p className="mt-2 font-sans text-xs text-text-2">
              En cours de contractualisation
            </p>
          </div>
        </div>

        {/* Card 3: Total Parcelles */}
        <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-[var(--shadow)] hover:shadow-[var(--shadow-hover)] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-semibold text-text-2 uppercase tracking-wider">
              Total Parcelles
            </span>
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Grid className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl font-bold text-text leading-none">
              {totalParcellesCount}
            </div>
            <p className="mt-2 font-sans text-xs text-text-2">
              Superficie totale: {totalAreaHectares} hectares
            </p>
          </div>
        </div>

        {/* Card 4: Parcelles Restantes */}
        <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-[var(--shadow)] hover:shadow-[var(--shadow-hover)] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-semibold text-text-2 uppercase tracking-wider">
              Parcelles Restantes
            </span>
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <MapPin className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl font-bold text-text leading-none">
              {availableParcellesCount}
            </div>
            <p className="mt-2 font-sans text-xs text-primary font-semibold">
              {stockPercentage}% du stock disponible
            </p>
          </div>
        </div>
      </div>

      {/* Main content grid: Chart + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Performances Chart (2/3 width) */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
          <div className="mb-4">
            <h2 className="font-display text-lg font-bold text-text">
              Aperçu des Performances
            </h2>
            <p className="font-sans text-xs text-text-2">
              Consultez vos métriques d'encaissement sur les 6 derniers mois
            </p>
          </div>

          {/* SVG Bar Chart in primary theme colors */}
          <div className="relative h-64 w-full mt-6">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const val = maxAmount * pct;
                return (
                  <div key={idx} className="flex items-center w-full">
                    <span className="w-16 text-right pr-3 font-mono text-[10px] text-text-2 select-none whitespace-nowrap">
                      {val >= 1000000
                        ? `${(val / 1000000).toFixed(1)}M`
                        : val >= 1000
                        ? `${(val / 1000).toFixed(0)}k`
                        : val.toFixed(0)}
                    </span>
                    <div className="flex-1 border-t border-dashed border-border" />
                  </div>
                );
              })}
            </div>

            {/* Bars container */}
            <div className="absolute inset-x-0 bottom-0 top-2 left-16 flex items-end justify-around px-4">
              {monthlyData.map((m, idx) => {
                const barHeightPct = maxAmount > 0 ? (m.amount / maxAmount) * 100 : 0;
                return (
                  <div key={idx} className="flex flex-col items-center group relative w-12">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all z-10 bg-text text-surface text-[10px] font-mono font-bold px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap">
                      {fmtFCFA(m.amount)} FCFA
                    </div>
                    {/* Bar */}
                    <div
                      style={{ height: `${Math.max(barHeightPct, 2)}%` }}
                      className="w-8 rounded-t bg-primary/85 hover:bg-primary transition-all duration-300 shadow-sm"
                    />
                    {/* Label */}
                    <span className="mt-2 font-sans text-[10px] text-text-2 font-semibold select-none">
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity (1/3 width) */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] flex flex-col">
          <div className="mb-4">
            <h2 className="font-display text-lg font-bold text-text">
              Activité Récente
            </h2>
            <p className="font-sans text-xs text-text-2">
              Derniers encaissements enregistrés sur la plateforme
            </p>
          </div>

          <div className="mt-4 flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-1">
            {recentPayments.length > 0 ? (
              recentPayments.map((p) => {
                const clientName = p.installment?.contract?.user?.name || "Client de test";
                const contractRef = p.installment?.contract?.reference || "Contrat";
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-border/50 bg-surface-2/30 p-3 hover:bg-surface-2/50 transition-colors"
                  >
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <ArrowUpRight className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-xs font-bold text-text truncate">
                        {clientName}
                      </p>
                      <p className="font-sans text-[10px] text-text-2 mt-0.5 truncate">
                        Contrat {contractRef}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-bold text-text block">
                        +{fmtFCFA(Number(p.amount))} F
                      </span>
                      <span className="font-sans text-[9px] text-text-2">
                        {new Date(p.paymentDate).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-text-2">
                <Calendar className="size-8 text-text-2/40 mb-2" />
                <span className="text-xs font-medium">Aucune activité récente.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
