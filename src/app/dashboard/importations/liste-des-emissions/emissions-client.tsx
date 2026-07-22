"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { fmtFCFA } from "@/lib/parcelles";

export function EmissionsClient({ initialEmissions }: { initialEmissions: any[] }) {
  const [emissions] = useState(initialEmissions);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = emissions.filter((e) => {
    const query = search.toLowerCase().trim();
    const matchSearch =
      !query ||
      e.reference.toLowerCase().includes(query) ||
      e.contractRef.toLowerCase().includes(query);

    const matchStatus =
      statusFilter === "all" || e.status === statusFilter;

    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text">
            Émissions
          </h1>
          <p className="mt-1 font-sans text-sm text-text-2">
            Liste des émissions
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-2" />
          <input
            type="text"
            placeholder="Rechercher référence émission ou contrat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-surface-2 pl-10 pr-4 font-sans text-sm outline-none focus:border-primary text-text placeholder:text-text-2"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 rounded-xl border border-border bg-surface-2 px-4 font-sans text-sm text-text outline-none cursor-pointer min-w-[130px]"
        >
          <option value="all">Statut</option>
          <option value="PAYE">PAYE</option>
          <option value="PENDING">EN ATTENTE</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left font-sans text-sm border-collapse">
          <thead className="bg-surface-2 text-text font-semibold border-b border-border">
            <tr>
              <th className="px-5 py-3.5">Référence</th>
              <th className="px-5 py-3.5">Contrat</th>
              <th className="px-5 py-3.5">Date de début</th>
              <th className="px-5 py-3.5">Date de fin</th>
              <th className="px-5 py-3.5">Périodicité</th>
              <th className="px-5 py-3.5">Montant</th>
              <th className="px-5 py-3.5">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text">
            {filtered.length > 0 ? (
              filtered.map((e) => (
                <tr key={e.id} className="hover:bg-surface-2/60 transition-colors">
                  <td className="px-5 py-4 font-bold text-text truncate max-w-[140px]" title={e.reference}>{e.reference}</td>
                  <td className="px-5 py-4 font-semibold text-text-2 truncate max-w-[140px]" title={e.contractRef}>{e.contractRef}</td>
                  <td className="px-5 py-4 text-text-2 font-medium whitespace-nowrap">{e.startDate}</td>
                  <td className="px-5 py-4 text-text-2 font-medium whitespace-nowrap">{e.endDate}</td>
                  <td className="px-5 py-4 font-medium whitespace-nowrap">{e.periodicity}</td>
                  <td className="px-5 py-4 font-semibold whitespace-nowrap">{fmtFCFA(e.amount)} FCFA</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="inline-flex rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-500 uppercase tracking-wider">
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-text-2">
                  Aucune émission trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2 font-sans text-xs text-text-2">
          <span>Lignes par page</span>
          <select className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text">
            <option value="10">10</option>
            <option value="25">25</option>
          </select>
        </div>

        <div className="font-sans text-xs text-text-2">
          {filtered.length} résultat(s) affiché(s)
        </div>

        <div className="flex items-center gap-2 font-sans text-xs font-medium text-text-2">
          <span>Page 1 sur 1</span>
          <div className="flex items-center gap-1">
            <button className="flex size-7 items-center justify-center rounded-lg border border-border bg-surface opacity-50 cursor-not-allowed">
              «
            </button>
            <button className="flex size-7 items-center justify-center rounded-lg border border-border bg-surface opacity-50 cursor-not-allowed">
              ‹
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
