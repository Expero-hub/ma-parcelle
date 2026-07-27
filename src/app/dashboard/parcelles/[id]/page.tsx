import { notFound } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Edit2, Calendar, FileText, User as UserIcon, ShieldAlert } from "lucide-react";

import { requirePermission, getCurrentUser } from "@/lib/authz";
import { getScopedPointOfSaleIds, type ScopedUser } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { ParcelleGallery } from "../_components/parcelle-gallery";

import { CadastralPreviewMap } from "../_components/cadastral-preview-map-loader";

type PageProps = {
  params: Promise<{ id: string }>;
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponible",
  RESERVED: "Réservée",
  SOLD: "Vendue",
};

export default async function ParcelleDetailPage({ params }: PageProps) {
  await requirePermission("read");
  const { id } = await params;

  const user = (await getCurrentUser())! as ScopedUser;
  const scopedPosIds = await getScopedPointOfSaleIds(user);

  const parcelle = await prisma.parcelle.findFirst({
    where: { id, deletedAt: null },
    include: {
      zone: true,
      pointOfSale: {
        include: { agency: true },
      },
      images: { orderBy: { order: "asc" } },
      reservations: {
        where: {
          deletedAt: null,
          contract: {
            deletedAt: null,
            status: { not: "CANCELLED" },
          },
        },
        include: {
          contract: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  createdAt: true,
                },
              },
              installments: {
                include: { payments: true },
                orderBy: { startDate: "asc" },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!parcelle) notFound();

  if (scopedPosIds !== null && (!parcelle.pointOfSaleId || !scopedPosIds.includes(parcelle.pointOfSaleId))) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="h-16 w-16 text-alert mb-4" />
        <h1 className="text-xl font-bold text-text">Accès refusé</h1>
        <p className="text-sm text-text-2 mt-1">Cette parcelle sort de votre périmètre d&apos;agence autorisé.</p>
        <Link href="/dashboard/parcelles" className="mt-4 text-sm font-semibold text-primary hover:underline">
          Retourner aux parcelles
        </Link>
      </div>
    );
  }

  // Financial and contract calculations
  let contract = null;
  let client = null;
  let recoveryRate = 0;
  let totalPaid = 0;
  let totalContractAmount = 0;

  const activeContract = parcelle.reservations?.[0]?.contract;
  if (activeContract) {
    totalContractAmount = Number(activeContract.totalAmount);
    for (const inst of activeContract.installments) {
      for (const pay of inst.payments) {
        totalPaid += Number(pay.amount);
      }
    }

    if (totalContractAmount > 0) {
      recoveryRate = Math.round((totalPaid / totalContractAmount) * 100);
    }

    contract = {
      id: activeContract.id,
      reference: activeContract.reference,
      startDate: activeContract.startDate,
      endDate: activeContract.endDate,
      totalAmount: totalContractAmount,
      status: activeContract.status,
      periodicity: activeContract.periodicity,
      installmentAmount: activeContract.installmentAmount ? Number(activeContract.installmentAmount) : null,
      paidAmount: totalPaid,
      remainingAmount: Math.max(0, totalContractAmount - totalPaid),
      installments: activeContract.installments.map((inst) => {
        let instPaid = 0;
        for (const pay of inst.payments) {
          instPaid += Number(pay.amount);
        }
        return {
          id: inst.id,
          reference: inst.reference,
          amount: Number(inst.amount),
          status: inst.status,
          startDate: inst.startDate,
          endDate: inst.endDate,
          paidAmount: instPaid,
        };
      }),
    };

    client = activeContract.user;
  }

  const imagesList = parcelle.images.map((img) => img.path);

  function formatPrice(p: number) {
    return new Intl.NumberFormat("fr-FR").format(p) + " FCFA";
  }

  function formatDate(d: Date | null | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // Calculate SVG circular gauge
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (recoveryRate / 100) * circumference;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/parcelles"
            className="inline-flex rounded-lg border border-border p-2 text-text-2 hover:bg-surface-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-2">Catalogue / Parcelles / {parcelle.reference}</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-text mt-1">{parcelle.reference}</h1>
            <p className="text-xs text-text-2 mt-0.5">
              Réf. cadastrale : <span className="font-mono font-semibold">{parcelle.reference}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={
              "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider " +
              (parcelle.status === "AVAILABLE"
                ? "bg-secondary/15 text-secondary"
                : parcelle.status === "RESERVED"
                  ? "bg-gold/15 text-gold-2"
                  : "bg-alert/15 text-alert")
            }
          >
            {STATUS_LABELS[parcelle.status]}
          </span>
          <Link
            href={`/dashboard/parcelles/${parcelle.id}/modifier`}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text hover:bg-surface-2 transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Modifier
          </Link>
        </div>
      </div>

      {/* TWO COLUMN GRID */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN: GALLERY, DETAILS, CADASTRAL PREVIEW */}
        <div className="lg:col-span-2 space-y-6">
          {/* GALLERY */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
            <ParcelleGallery images={imagesList} />
          </div>

          {/* CARACTERISTIQUES */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-6">
            <h2 className="text-lg font-bold text-text">Caractéristiques</h2>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <span className="text-xs font-semibold text-text-2 block uppercase tracking-wider">Superficie</span>
                <span className="text-base font-bold text-text">{parcelle.area.toString()} m²</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-text-2 block uppercase tracking-wider">Prix au m²</span>
                <span className="text-base font-bold text-text">
                  {formatPrice(Math.round(Number(parcelle.price) / Number(parcelle.area)))} / m²
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-text-2 block uppercase tracking-wider">Agence</span>
                <span className="text-base font-bold text-text">{parcelle.pointOfSale?.agency.name ?? "—"}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-text-2 block uppercase tracking-wider">Durée de paiement</span>
                <span className="text-base font-bold text-text">
                  {parcelle.minDuration && parcelle.maxDuration
                    ? `${parcelle.minDuration * 12} à ${parcelle.maxDuration * 12} mois`
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-text-2 block uppercase tracking-wider">Localisation</span>
                <span className="text-base font-bold text-text">
                  {parcelle.zone.commune ? `${parcelle.zone.commune}, ${parcelle.zone.department}` : "—"}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-text-2 block uppercase tracking-wider">Réf. cadastrale</span>
                <span className="text-base font-mono font-semibold text-text">{parcelle.reference}</span>
              </div>
            </div>

            {parcelle.description && (
              <div className="border-t border-border pt-4">
                <span className="text-xs font-semibold text-text-2 block uppercase tracking-wider mb-2">Description</span>
                <p className="text-sm text-text leading-relaxed">{parcelle.description}</p>
              </div>
            )}
          </div>

          {/* EMPRISE CADASTRALE (Leaflet preview) */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-text">Emprise cadastrale</h2>
            <CadastralPreviewMap geom={parcelle.geom} />
          </div>
        </div>

        {/* RIGHT COLUMN: RECOVERY CHART, CONTRACT DETAILS, CLIENT CARD */}
        <div className="space-y-6">
          {/* RECOVERY CARD */}
          {parcelle.status !== "AVAILABLE" && (
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs flex flex-col items-center text-center">
              <h3 className="text-xs font-bold text-text-2 uppercase tracking-widest mb-4">Taux de recouvrement</h3>
              
              <div className="relative h-36 w-36 mb-4 flex items-center justify-center">
                <svg className="h-full w-full -rotate-90">
                  <circle cx="72" cy="72" r={radius} className="stroke-border" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className="stroke-primary transition-all duration-500"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-extrabold text-text">{recoveryRate}%</span>
                </div>
              </div>

              <p className="text-xs font-semibold text-text">
                {formatPrice(totalPaid)} payés sur {formatPrice(totalContractAmount)}
              </p>
            </div>
          )}

          {/* CONTRACT CARD */}
          {contract ? (
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-display font-bold text-text">Contrat lié</h3>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-2">Référence</span>
                  <span className="font-semibold text-text">{contract.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-2">Date début</span>
                  <span className="font-semibold text-text">{formatDate(contract.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-2">Durée</span>
                  <span className="font-semibold text-text">{contract.installments.length} mois</span>
                </div>
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="text-text-2">Montant total</span>
                  <span className="font-bold text-text">{formatPrice(contract.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-2">Déjà payé</span>
                  <span className="font-bold text-secondary">{formatPrice(contract.paidAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-2">Reste dû</span>
                  <span className="font-bold text-alert">{formatPrice(contract.remainingAmount)}</span>
                </div>
              </div>

              {/* Installments Échéancier */}
              <div className="border-t border-border pt-4">
                <h4 className="text-xs font-bold text-text-2 uppercase tracking-wider mb-3">Échéancier</h4>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {contract.installments.map((inst, idx) => (
                    <div key={inst.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            "h-2 w-2 rounded-full " +
                            (inst.status === "PAID"
                              ? "bg-secondary"
                              : inst.status === "PARTIAL"
                                ? "bg-gold"
                                : "bg-alert")
                          }
                        />
                        <span className="font-semibold text-text">Mensualité {idx + 1}</span>
                      </div>
                      <span className="font-mono text-text-2">{formatPrice(inst.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* PLACEHOLDER AND RESERVATION BUTTON */
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/15 text-secondary mx-auto">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-text">Aucun contrat lié</h3>
                <p className="text-xs text-text-2 mt-1">Cette parcelle est libre pour de nouvelles acquisitions.</p>
              </div>
              <Link
                href={`/dashboard/reservations/nouveau?parcelleId=${parcelle.id}`}
                className="block w-full rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-on-primary hover:bg-primary/95 transition-colors"
              >
                Faire une réservation
              </Link>
            </div>
          )}

          {/* CLIENT CARD */}
          {client && (
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <UserIcon className="h-5 w-5 text-primary" />
                <h3 className="font-display font-bold text-text">Client lié</h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg uppercase">
                  {client.name.substring(0, 2)}
                </div>
                <div>
                  <h4 className="font-bold text-text leading-tight">{client.name}</h4>
                  <p className="text-xs text-text-2 mt-0.5">Client depuis {formatDate(client.createdAt)}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs border-t border-border pt-4 text-text-2 font-medium">
                <div className="flex justify-between">
                  <span>Téléphone</span>
                  <span className="text-text">{client.phone ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email</span>
                  <span className="text-text">{client.email}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

