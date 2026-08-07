"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, ExternalLink, MoreHorizontal, Clock, CheckCircle2, XCircle } from "lucide-react";
import { fmtFCFA } from "@/lib/parcelles";
import { TablePagination } from "@/components/ui/paginated-table-wrapper";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type IntentionItem = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "CONVERTED";
  createdAt: string;
  parcelle: {
    reference: string;
    commune?: string | null;
    department?: string | null;
  };
  contract?: {
    reference: string;
    totalAmount: number;
    periodicity?: string | null;
  } | null;
};

const PERIODICITY_LABELS: Record<string, string> = {
  MONTHLY: "Mensuelle",
  QUARTERLY: "Trimestrielle",
  BIANNUAL: "Semestrielle",
  ANNUAL: "Annuelle",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente de validation",
  CONFIRMED: "Validé",
  CONVERTED: "Clôturé",
  CANCELLED: "Annulé",
};

export function IntentionsTable({
  initialIntentions,
}: {
  initialIntentions: IntentionItem[];
}) {
  const [activeTab, setActiveTab] = useState<"toutes" | "en_attente" | "validees" | "annulees">("toutes");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const enAttenteList = initialIntentions.filter((r) => r.status === "PENDING");
  const valideesList = initialIntentions.filter((r) => r.status === "CONFIRMED" || r.status === "CONVERTED");
  const annuleesList = initialIntentions.filter((r) => r.status === "CANCELLED");

  const currentList =
    activeTab === "toutes"
      ? initialIntentions
      : activeTab === "en_attente"
      ? enAttenteList
      : activeTab === "validees"
      ? valideesList
      : annuleesList;

  const totalResults = currentList.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedList = currentList.slice(startIndex, startIndex + pageSize);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const day = String(d.getUTCDate()).padStart(2, "0");
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header text */}
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Mes intentions d'achat</h1>
        <p className="mt-1 text-sm text-secondary font-medium">
          Suivez toutes vos manifestations d'intérêt sur les parcelles disponibles
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-surface-2/60 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => {
            setActiveTab("toutes");
            setCurrentPage(1);
          }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-sans text-sm font-semibold transition-all cursor-pointer",
            activeTab === "toutes"
              ? "bg-surface text-text shadow-xs border border-border"
              : "text-text-2 hover:text-text"
          )}
        >
          <span>Toutes ({initialIntentions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("en_attente");
            setCurrentPage(1);
          }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-sans text-sm font-semibold transition-all cursor-pointer",
            activeTab === "en_attente"
              ? "bg-surface text-text shadow-xs border border-border"
              : "text-text-2 hover:text-text"
          )}
        >
          <Clock className="h-4 w-4 text-amber-500" />
          <span>En attente ({enAttenteList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("validees");
            setCurrentPage(1);
          }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-sans text-sm font-semibold transition-all cursor-pointer",
            activeTab === "validees"
              ? "bg-surface text-text shadow-xs border border-border"
              : "text-text-2 hover:text-text"
          )}
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>Validées ({valideesList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("annulees");
            setCurrentPage(1);
          }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-sans text-sm font-semibold transition-all cursor-pointer",
            activeTab === "annulees"
              ? "bg-surface text-text shadow-xs border border-border"
              : "text-text-2 hover:text-text"
          )}
        >
          <XCircle className="h-4 w-4 text-red-500" />
          <span>Annulées ({annuleesList.length})</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-xs">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-surface-2/80 text-text-2 border-b border-border">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Parcelle</th>
              <th className="px-5 py-3.5 font-semibold">Contrat</th>
              <th className="px-5 py-3.5 font-semibold">Montant du contrat</th>
              <th className="px-5 py-3.5 font-semibold">Périodicité</th>
              <th className="px-5 py-3.5 font-semibold">Date de demande</th>
              <th className="px-5 py-3.5 font-semibold">Statut</th>
              <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border text-text">
            {paginatedList.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-text-2 font-medium">
                  Aucune donnée trouvée.
                </td>
              </tr>
            ) : (
              paginatedList.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-surface-2/40">
                  <td className="px-5 py-4 font-semibold text-text">
                    <Link
                      href={`/parcelles/${r.parcelle.reference}`}
                      className="hover:text-primary transition-colors inline-flex items-center gap-1.5"
                    >
                      {r.parcelle.reference}
                      <ExternalLink className="h-3.5 w-3.5 text-text-2" />
                    </Link>
                    {r.parcelle.commune && (
                      <span className="block text-xs font-normal text-text-2 mt-0.5">
                        {r.parcelle.commune}
                        {r.parcelle.department ? `, ${r.parcelle.department}` : ""}
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4 font-mono text-text">
                    {r.contract ? r.contract.reference : "—"}
                  </td>

                  <td className="px-5 py-4 font-mono font-semibold text-primary">
                    {r.contract ? `${fmtFCFA(r.contract.totalAmount)} FCFA` : "—"}
                  </td>

                  <td className="px-5 py-4 text-text-2">
                    {r.contract?.periodicity
                      ? PERIODICITY_LABELS[r.contract.periodicity] || r.contract.periodicity
                      : "—"}
                  </td>

                  <td className="px-5 py-4 text-text-2 font-mono">
                    {formatDate(r.createdAt)}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
                        r.status === "PENDING" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                        (r.status === "CONFIRMED" || r.status === "CONVERTED") && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                        r.status === "CANCELLED" && "bg-red-500/15 text-red-600 dark:text-red-400"
                      )}
                    >
                      {STATUS_LABELS[r.status]}
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
                            href={`/parcelles/${r.parcelle.reference}`}
                            className="flex items-center gap-2 w-full"
                          >
                            <Eye className="h-4 w-4 text-primary" />
                            <span>Détail</span>
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
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
