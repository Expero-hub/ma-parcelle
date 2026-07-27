import Link from "next/link";
import { Bookmark, FileText, Calendar, ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { fmtFCFA } from "@/lib/parcelles";

const RESERVATION_STATUS_CONFIG: Record<
  string,
  { label: string; bgClass: string; textClass: string }
> = {
  PENDING: {
    label: "En attente",
    bgClass: "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20",
    textClass: "text-amber-700 dark:text-amber-400",
  },
  CONFIRMED: {
    label: "Confirmée",
    bgClass: "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20",
    textClass: "text-emerald-700 dark:text-emerald-400",
  },
  CANCELLED: {
    label: "Annulée",
    bgClass: "bg-red-500/10 dark:bg-red-500/15 border-red-500/20",
    textClass: "text-red-700 dark:text-red-400",
  },
  CONVERTED: {
    label: "Clôturée",
    bgClass: "bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/20",
    textClass: "text-blue-700 dark:text-blue-400",
  },
};

const CONTRACT_STATUS_CONFIG: Record<
  string,
  { label: string; bgClass: string; textClass: string }
> = {
  ACTIVE: {
    label: "Actif",
    bgClass: "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20",
    textClass: "text-emerald-700 dark:text-emerald-400",
  },
  DRAFT: {
    label: "Brouillon",
    bgClass: "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20",
    textClass: "text-amber-700 dark:text-amber-400",
  },
  COMPLETED: {
    label: "Terminé",
    bgClass: "bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/20",
    textClass: "text-blue-700 dark:text-blue-400",
  },
  CANCELLED: {
    label: "Annulé",
    bgClass: "bg-red-500/10 dark:bg-red-500/15 border-red-500/20",
    textClass: "text-red-700 dark:text-red-400",
  },
};

export default async function MonEspacePage() {
  const user = await requireUser();

  const [
    reservationsCount,
    totalReservationsCount,
    contractsCount,
    totalContractsCount,
    lastReservation,
    lastContract,
  ] = await Promise.all([
    prisma.reservation.count({
      where: { userId: user.id, deletedAt: null, status: { in: ["PENDING", "CONFIRMED"] } },
    }),
    prisma.reservation.count({
      where: { userId: user.id, deletedAt: null },
    }),
    prisma.contract.count({
      where: { userId: user.id, deletedAt: null, status: "ACTIVE" },
    }),
    prisma.contract.count({
      where: { userId: user.id, deletedAt: null },
    }),
    prisma.reservation.findFirst({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        parcelle: {
          include: {
            zone: true,
          },
        },
      },
    }),
    prisma.contract.findFirst({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        parcelle: {
          include: {
            zone: true,
          },
        },
      },
    }),
  ]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col flex-1 gap-6 p-6 md:p-8">
      {/* Salutation */}
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-text">
          Bonjour, {user.name}
        </h1>
        <p className="mt-1 text-sm text-text-2">
          Bienvenue dans votre espace personnel. Suivez vos réservations et vos contrats en cours.
        </p>
      </div>

      {/* Grid Compteurs */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Réservations */}
        <Link
          href="/mon-espace/reservations"
          className="group rounded-2xl border border-border/80 bg-surface p-6 shadow-[var(--shadow)] hover:shadow-[var(--shadow-hover)] transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="font-sans text-xs font-semibold text-text-2 uppercase tracking-wider">
                Mes réservations en cours
              </span>
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary group-hover:bg-primary group-hover:text-on-primary transition-all">
                <Bookmark className="size-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-mono text-4xl font-bold text-text leading-none">
                {reservationsCount}
              </div>
              <p className="mt-2 text-xs text-text-2 font-medium">
                {totalReservationsCount} au total sur la plateforme
              </p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border/40 flex items-center gap-1.5 text-xs text-primary font-bold">
            <span>Gérer mes réservations</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Contrats */}
        <Link
          href="/mon-espace/contrats"
          className="group rounded-2xl border border-border/80 bg-surface p-6 shadow-[var(--shadow)] hover:shadow-[var(--shadow-hover)] transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="font-sans text-xs font-semibold text-text-2 uppercase tracking-wider">
                Mes contrats actifs
              </span>
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary group-hover:bg-primary group-hover:text-on-primary transition-all">
                <FileText className="size-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="font-mono text-4xl font-bold text-text leading-none">
                {contractsCount}
              </div>
              <p className="mt-2 text-xs text-text-2 font-medium">
                {totalContractsCount} au total signés
              </p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border/40 flex items-center gap-1.5 text-xs text-primary font-bold">
            <span>Consulter mes contrats</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Activités Récentes / Dernières Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Dernière Réservation */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] flex flex-col justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-text mb-4">
              Dernière réservation
            </h2>
            {lastReservation ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/parcelles/${lastReservation.parcelle.reference}`}
                      className="group/link text-primary hover:text-primary-hover font-semibold inline-flex items-center gap-1.5"
                    >
                      <span>Parcelle {lastReservation.parcelle.reference}</span>
                      <ExternalLink className="size-3.5 text-text-2 group-hover/link:text-primary transition-colors" />
                    </Link>
                    <span className="block text-xs text-text-2 mt-1">
                      {lastReservation.parcelle.zone?.commune}
                      {lastReservation.parcelle.zone?.district ? `, Quartier ${lastReservation.parcelle.zone.district}` : ""}
                    </span>
                  </div>
                  {(() => {
                    const conf = RESERVATION_STATUS_CONFIG[lastReservation.status] || {
                      label: lastReservation.status,
                      bgClass: "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20",
                      textClass: "text-amber-700 dark:text-amber-400",
                    };
                    return (
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${conf.bgClass} ${conf.textClass}`}
                      >
                        {conf.label}
                      </span>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-4 bg-surface-2/30 rounded-xl p-3 text-xs border border-border/30">
                  <div>
                    <span className="text-text-2 block mb-0.5">Date demande</span>
                    <span className="font-medium text-text flex items-center gap-1">
                      <Calendar className="size-3 text-text-2" />
                      {formatDate(lastReservation.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-2 block mb-0.5">Superficie</span>
                    <span className="font-mono font-semibold text-text">
                      {lastReservation.parcelle.area} m²
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-text-2 text-xs">
                Aucune réservation effectuée pour le moment.
              </div>
            )}
          </div>

          {lastReservation && (
            <div className="mt-6 pt-4 border-t border-border/40 text-right">
              <Link
                href="/mon-espace/reservations"
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>Toutes mes réservations</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Dernier Contrat */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] flex flex-col justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-text mb-4">
              Dernier contrat
            </h2>
            {lastContract ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-bold text-text block">
                      Réf: {lastContract.reference}
                    </span>
                    <span className="block text-xs text-text-2 mt-1">
                      {lastContract.parcelle ? (
                        <>
                          Rattaché à la parcelle{" "}
                          <Link
                            href={`/parcelles/${lastContract.parcelle.reference}`}
                            className="text-primary hover:underline font-semibold"
                          >
                            {lastContract.parcelle.reference}
                          </Link>
                        </>
                      ) : (
                        "Aucune parcelle rattachée"
                      )}
                    </span>
                  </div>
                  {(() => {
                    const conf = CONTRACT_STATUS_CONFIG[lastContract.status] || {
                      label: lastContract.status,
                      bgClass: "bg-neutral-500/10 border-neutral-500/20",
                      textClass: "text-neutral-600",
                    };
                    return (
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${conf.bgClass} ${conf.textClass}`}
                      >
                        {conf.label}
                      </span>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-4 bg-surface-2/30 rounded-xl p-3 text-xs border border-border/30">
                  <div>
                    <span className="text-text-2 block mb-0.5">Montant total</span>
                    <span className="font-mono font-bold text-primary">
                      {fmtFCFA(Number(lastContract.totalAmount))} FCFA
                    </span>
                  </div>
                  {lastContract.installmentAmount && (
                    <div>
                      <span className="text-text-2 block mb-0.5">Échéance</span>
                      <span className="font-mono font-bold text-text">
                        {fmtFCFA(Number(lastContract.installmentAmount))} F
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-text-2 text-xs">
                Aucun contrat signé pour le moment.
              </div>
            )}
          </div>

          {lastContract && (
            <div className="mt-6 pt-4 border-t border-border/40 text-right">
              <Link
                href="/mon-espace/contrats"
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>Tous mes contrats</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
