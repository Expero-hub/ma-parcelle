"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, FileText, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { fmtFCFA } from "@/lib/parcelles";
import { TablePagination } from "@/components/ui/paginated-table-wrapper";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export type ContractItem = {
  id: string;
  reference: string;
  totalAmount: number;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  periodicity?: string | null;
  installmentAmount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  parcelle: {
    reference: string;
    commune?: string | null;
    companyName?: string | null;
    agencyName?: string | null;
  };
};

const PERIODICITY_LABELS: Record<string, string> = {
  MONTHLY: "Mensuelle",
  QUARTERLY: "Trimestrielle",
  BIANNUAL: "Semestrielle",
  ANNUAL: "Annuelle",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; bgClass: string; textClass: string; icon: React.ReactNode }
> = {
  ACTIVE: {
    label: "Actif",
    bgClass: "bg-emerald-500/15 border-emerald-500/30",
    textClass: "text-emerald-600 dark:text-emerald-400",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  DRAFT: {
    label: "Brouillon",
    bgClass: "bg-amber-500/15 border-amber-500/30",
    textClass: "text-amber-600 dark:text-amber-400",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  COMPLETED: {
    label: "Terminé",
    bgClass: "bg-blue-500/15 border-blue-500/30",
    textClass: "text-blue-600 dark:text-blue-400",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  CANCELLED: {
    label: "Annulé",
    bgClass: "bg-red-500/15 border-red-500/30",
    textClass: "text-red-600 dark:text-red-400",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

export function ContratsTable({
  initialContracts,
}: {
  initialContracts: ContractItem[];
}) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredContracts = initialContracts.filter((c) => {
    if (filterStatus === "ALL") return true;
    return c.status === filterStatus;
  });

  const totalResults = filteredContracts.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedContracts = filteredContracts.slice(startIndex, startIndex + pageSize);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header text */}
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Mes contrats</h1>
        <p className="mt-1 text-sm text-secondary font-medium">
          Consultez la liste de vos contrats et engagements avec nos compagnies partenaires.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {[
          { key: "ALL", label: `Tous (${initialContracts.length})` },
          {
            key: "ACTIVE",
            label: `Actifs (${initialContracts.filter((c) => c.status === "ACTIVE").length})`,
          },
          {
            key: "COMPLETED",
            label: `Terminés (${initialContracts.filter((c) => c.status === "COMPLETED").length})`,
          },
          {
            key: "DRAFT",
            label: `Brouillons (${initialContracts.filter((c) => c.status === "DRAFT").length})`,
          },
          {
            key: "CANCELLED",
            label: `Annulés (${initialContracts.filter((c) => c.status === "CANCELLED").length})`,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setFilterStatus(tab.key);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              filterStatus === tab.key
                ? "bg-primary text-on-primary shadow-xs"
                : "bg-surface-2 text-text-2 hover:text-text hover:bg-surface-2/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-xs">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-surface-2/80 text-text-2 border-b border-border">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Référence</th>
              <th className="px-5 py-3.5 font-semibold">Compagnie / Agence</th>
              <th className="px-5 py-3.5 font-semibold">Parcelle</th>
              <th className="px-5 py-3.5 font-semibold">Montant total</th>
              <th className="px-5 py-3.5 font-semibold">Périodicité</th>
              <th className="px-5 py-3.5 font-semibold">Échéance</th>
              <th className="px-5 py-3.5 font-semibold">Statut</th>
              <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border text-text">
            {paginatedContracts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-text-2 font-medium">
                  Aucun contrat trouvé.
                </td>
              </tr>
            ) : (
              paginatedContracts.map((c) => {
                const conf = STATUS_CONFIG[c.status] || {
                  label: c.status,
                  bgClass: "bg-neutral-500/15 border-neutral-500/30",
                  textClass: "text-neutral-400",
                  icon: <AlertCircle className="h-3.5 w-3.5" />,
                };

                return (
                  <tr key={c.id} className="transition-colors hover:bg-surface-2/40">
                    <td className="px-5 py-4 font-mono font-bold text-text">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span>{c.reference}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-text font-medium">
                      {c.parcelle.companyName || "Compagnie Partenaire"}
                      {c.parcelle.agencyName && (
                        <span className="block text-xs font-normal text-text-2 mt-0.5">
                          Agence: {c.parcelle.agencyName}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {c.parcelle.reference !== "—" ? (
                        <Link
                          href={`/parcelles/${c.parcelle.reference}`}
                          className="text-primary hover:underline"
                        >
                          {c.parcelle.reference}
                        </Link>
                      ) : (
                        <span className="text-text-2">—</span>
                      )}
                      {c.parcelle.commune && c.parcelle.commune !== "—" && (
                        <span className="block text-xs font-normal text-text-2 mt-0.5">
                          {c.parcelle.commune}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 font-mono font-bold text-text">
                      {fmtFCFA(c.totalAmount)} FCFA
                    </td>

                    <td className="px-5 py-4 text-text-2 font-medium">
                      {c.periodicity
                        ? PERIODICITY_LABELS[c.periodicity] || c.periodicity
                        : "—"}
                    </td>

                    <td className="px-5 py-4 font-mono text-text-2">
                      {c.installmentAmount
                        ? `${fmtFCFA(c.installmentAmount)} FCFA`
                        : "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${conf.bgClass} ${conf.textClass}`}
                      >
                        {conf.icon}
                        <span>{conf.label}</span>
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <button className="rounded-lg p-2 text-text-2 hover:bg-surface-2 hover:text-text transition-colors cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Link
                              href={`/parcelles/${c.parcelle.reference}`}
                              className="flex items-center gap-2 w-full"
                            >
                              <Eye className="h-4 w-4 text-primary" />
                              <span>Détails parcelle</span>
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalResults={totalResults}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
