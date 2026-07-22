"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, ExternalLink, MoreHorizontal, Clock, CheckCircle2, XCircle } from "lucide-react";
import { fmtFCFA } from "@/lib/parcelles";
import { TablePagination } from "@/components/ui/paginated-table-wrapper";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ReservationItem = {
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

export function ReservationsTable({
  initialReservations,
}: {
  initialReservations: ReservationItem[];
}) {
  const [activeTab, setActiveTab] = useState<"en_cours" | "annulees" | "cloturees">("en_cours");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Grouping by status
  const enCoursList = initialReservations.filter(
    (r) => r.status === "PENDING" || r.status === "CONFIRMED",
  );
  const annuleesList = initialReservations.filter((r) => r.status === "CANCELLED");
  const clotureesList = initialReservations.filter((r) => r.status === "CONVERTED");

  const currentList =
    activeTab === "en_cours"
      ? enCoursList
      : activeTab === "annulees"
      ? annuleesList
      : clotureesList;

  const totalResults = currentList.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedList = currentList.slice(startIndex, startIndex + pageSize);

  const formatDate = (dateStr: string) => {
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
        <h1 className="font-display text-2xl font-bold text-text">Mes réservations</h1>
        <p className="mt-1 text-sm text-secondary font-medium">
          Suivez le cycle complet de vos réservations de parcelles
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-surface-2/60 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => {
            setActiveTab("en_cours");
            setCurrentPage(1);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-sans text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "en_cours"
              ? "bg-surface text-text shadow-xs border border-border"
              : "text-text-2 hover:text-text"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Réservations en cours ({enCoursList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("annulees");
            setCurrentPage(1);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-sans text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "annulees"
              ? "bg-surface text-text shadow-xs border border-border"
              : "text-text-2 hover:text-text"
          }`}
        >
          <XCircle className="h-4 w-4" />
          <span>Réservations annulées ({annuleesList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("cloturees");
            setCurrentPage(1);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-sans text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "cloturees"
              ? "bg-surface text-text shadow-xs border border-border"
              : "text-text-2 hover:text-text"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Réservations clôturées ({clotureesList.length})</span>
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
              <th className="px-5 py-3.5 font-semibold">Réserver le</th>
              <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border text-text">
            {paginatedList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-text-2 font-medium">
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
