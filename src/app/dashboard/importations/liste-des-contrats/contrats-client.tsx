"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User as UserIcon, Edit3, ShieldAlert, X, MoreHorizontal } from "lucide-react";

import { fmtFCFA } from "@/lib/parcelles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ContractItem = {
  id: string;
  reference: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  periodicity: string;
  prime: number;
  startDate: string;
  endDate: string;
  agencyId: string;
  agencyName: string;
  companyName: string;
  status: string;
  isActive: boolean;
};

type AgencyOption = {
  id: string;
  name: string;
};

const STATUS_STYLES: Record<string, { bgClass: string; textClass: string }> = {
  "EN COURS": { bgClass: "bg-emerald-500/15", textClass: "text-emerald-600 dark:text-emerald-400" },
  "BROUILLON": { bgClass: "bg-amber-500/15", textClass: "text-amber-600 dark:text-amber-400" },
  "TERMINE": { bgClass: "bg-blue-500/15", textClass: "text-blue-600 dark:text-blue-400" },
  "ANNULE": { bgClass: "bg-red-500/15", textClass: "text-red-600 dark:text-red-400" },
};

export function ContratsClient({
  initialContracts,
  agencies,
}: {
  initialContracts: ContractItem[];
  agencies: AgencyOption[];
}) {
  const router = useRouter();
  const [contracts, setContracts] = useState<ContractItem[]>(initialContracts);
  const [search, setSearch] = useState("");
  const [periodicityFilter, setPeriodicityFilter] = useState("all");
  const [editingContract, setEditingContract] = useState<ContractItem | null>(null);

  const filtered = contracts.filter((c) => {
    const query = search.toLowerCase().trim();
    const matchSearch =
      !query ||
      c.reference.toLowerCase().includes(query) ||
      c.clientName.toLowerCase().includes(query) ||
      c.clientEmail.toLowerCase().includes(query);

    const matchPeriod =
      periodicityFilter === "all" || c.periodicity === periodicityFilter;

    return matchSearch && matchPeriod;
  });

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: active }),
      });
      if (res.ok) {
        setContracts((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  isActive: active,
                  status: active ? "EN COURS" : "DRAFT",
                }
              : c
          )
        );
        router.refresh();
      }
    } catch (err) {
      console.error("Erreur de mise à jour du statut :", err);
    }
  };

  const handleCancelContract = async (id: string) => {
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (res.ok) {
        setContracts((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  isActive: false,
                  status: "ANNULE",
                }
              : c
          )
        );
        router.refresh();
      }
    } catch (err) {
      console.error("Erreur d'annulation du contrat :", err);
    }
  };

  const handleEditSuccess = (updated: any) => {
    setContracts((prev) =>
      prev.map((c) =>
        c.id === updated.id
          ? {
              ...c,
              totalAmount: Number(updated.totalAmount),
              prime: Number(updated.totalAmount),
              periodicity:
                updated.periodicity === "MONTHLY"
                  ? "Mensuelle"
                  : updated.periodicity === "QUARTERLY"
                  ? "Trimestrielle"
                  : updated.periodicity === "BIANNUAL"
                  ? "Semestrielle"
                  : updated.periodicity === "ANNUAL"
                  ? "Annuelle"
                  : updated.periodicity,
              startDate: updated.startDate
                ? new Date(updated.startDate).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—",
              endDate: updated.endDate
                ? new Date(updated.endDate).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—",
              agencyId: updated.agencyId,
              agencyName: updated.agency?.name || "—",
            }
          : c
      )
    );
    setEditingContract(null);
    router.refresh();
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      {/* Top Header */}
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-text">
          Contrats
        </h1>
        <p className="mt-1 font-sans text-sm text-text-2">
          Consultez et gérez la liste de vos contrats clients.
        </p>
      </div>

      {/* Filters & Search bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-2" />
          <input
            type="text"
            placeholder="Rechercher par référence, nom client ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-surface-2 pl-10 pr-4 font-sans text-sm outline-none focus:border-primary text-text placeholder:text-text-2"
          />
        </div>

        <select
          value={periodicityFilter}
          onChange={(e) => setPeriodicityFilter(e.target.value)}
          className="h-11 rounded-xl border border-border bg-surface-2 px-4 font-sans text-sm text-text outline-none cursor-pointer"
        >
          <option value="all">Périodicité</option>
          <option value="Mensuelle">Mensuelle</option>
          <option value="Trimestrielle">Trimestrielle</option>
          <option value="Semestrielle">Semestrielle</option>
          <option value="Annuelle">Annuelle</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left font-sans text-sm border-collapse">
          <thead className="bg-surface-2 text-text font-semibold border-b border-border">
            <tr>
              <th className="px-5 py-3.5">N° Police</th>
              <th className="px-5 py-3.5">Client</th>
              <th className="px-5 py-3.5">Périodicité</th>
              <th className="px-5 py-3.5">Prime</th>
              <th className="px-5 py-3.5">Dates</th>
              <th className="px-5 py-3.5">Agence</th>
              <th className="px-5 py-3.5">Statut</th>
              <th className="px-5 py-3.5">Autorisation</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text">
            {filtered.length > 0 ? (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-surface-2/60 transition-colors">
                  <td
                    className="px-5 py-4 font-bold text-text truncate max-w-[120px]"
                    title={c.reference}
                  >
                    {c.reference}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-surface-2 text-text-2 border border-border shrink-0">
                        <UserIcon className="size-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span
                          className="font-semibold text-text truncate max-w-[180px]"
                          title={c.clientName}
                        >
                          {c.clientName}
                        </span>
                        <span
                          className="text-xs text-text-2 truncate max-w-[180px]"
                          title={c.clientEmail}
                        >
                          {c.clientEmail}
                        </span>
                        <span
                          className="text-xs text-text-2 truncate max-w-[180px]"
                          title={c.clientPhone}
                        >
                          {c.clientPhone}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-medium whitespace-nowrap">{c.periodicity}</td>
                  <td className="px-5 py-4 font-semibold whitespace-nowrap">
                    {fmtFCFA(c.prime)} FCFA
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex flex-col text-xs font-medium">
                      <span>
                        Début : <strong className="text-text">{c.startDate}</strong>
                      </span>
                      <span className="mt-0.5">
                        Fin : <strong className="text-text">{c.endDate}</strong>
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-text-2 font-medium truncate max-w-[150px]" title={c.agencyName}>
                    {c.agencyName}
                  </td>
                  <td className="px-5 py-4">
                    {(() => {
                      const style = STATUS_STYLES[c.status] || {
                        bgClass: "bg-neutral-500/15",
                        textClass: "text-neutral-500",
                      };
                      return (
                        <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${style.bgClass} ${style.textClass}`}>
                          {c.status}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(c.id, !c.isActive)}
                      className="inline-flex items-center gap-2 cursor-pointer"
                    >
                      <div
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          c.isActive ? "bg-emerald-500" : "bg-surface-2 border border-border"
                        }`}
                      >
                        <span
                          className={`inline-block size-5 transform rounded-full bg-white transition-transform ${
                            c.isActive ? "translate-x-5" : "translate-x-0.5"
                          } top-0.5 relative`}
                        />
                      </div>
                      <span className="text-xs font-bold text-emerald-500">
                        {c.isActive ? "Actif" : "Inactif"}
                      </span>
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex rounded-lg p-1.5 text-text-2 hover:bg-surface-2 cursor-pointer">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36 bg-surface border border-border rounded-xl shadow-lg p-1">
                        <DropdownMenuItem
                          onClick={() => setEditingContract(c)}
                          disabled={c.status !== "EN COURS"}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg cursor-pointer transition-colors"
                        >
                          <Edit3 className="size-3.5 text-primary" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleCancelContract(c.id)}
                          disabled={c.status === "ANNULE"}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg cursor-pointer transition-colors"
                        >
                          <ShieldAlert className="size-3.5" />
                          Annuler
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-12 text-center text-text-2">
                  Aucun contrat trouvé.
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

      {/* Modale d'Édition du Contrat */}
      {editingContract && (
        <EditContractModal
          open={!!editingContract}
          onOpenChange={(open) => !open && setEditingContract(null)}
          contract={editingContract}
          agencies={agencies}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}

function EditContractModal({
  open,
  onOpenChange,
  contract,
  agencies,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractItem;
  agencies: AgencyOption[];
  onSuccess: (updated: any) => void;
}) {
  const [totalAmount, setTotalAmount] = useState(contract.prime);
  const [periodicity, setPeriodicity] = useState(
    contract.periodicity === "Mensuelle"
      ? "MONTHLY"
      : contract.periodicity === "Trimestrielle"
      ? "QUARTERLY"
      : contract.periodicity === "Semestrielle"
      ? "BIANNUAL"
      : contract.periodicity === "Annuelle"
      ? "ANNUAL"
      : "MONTHLY"
  );

  // Convert localized dates to standard input date format YYYY-MM-DD
  const parseFrDateToIso = (dateStr: string) => {
    if (!dateStr || dateStr === "—") return "";
    const parts = dateStr.split(" ");
    if (parts.length !== 3) return "";
    const day = parts[0];
    const monthStr = parts[1].replace(".", "").toLowerCase();
    const year = parts[2];

    const months: Record<string, string> = {
      janv: "01",
      févr: "02",
      mars: "03",
      avr: "04",
      mai: "05",
      juin: "06",
      juil: "07",
      août: "08",
      sept: "09",
      oct: "10",
      nov: "11",
      déc: "12",
    };

    const month = months[monthStr] || "01";
    return `${year}-${month}-${day.padStart(2, "0")}`;
  };

  const [startDate, setStartDate] = useState(parseFrDateToIso(contract.startDate));
  const [endDate, setEndDate] = useState(parseFrDateToIso(contract.endDate));
  const [agencyId, setAgencyId] = useState(contract.agencyId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalAmount: Number(totalAmount),
          periodicity,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
          agencyId,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.message || "Une erreur est survenue lors de la mise à jour.");
      } else {
        onSuccess(result.data);
      }
    } catch (err) {
      console.error(err);
      setError("Erreur réseau de communication avec le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl text-text">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
          <div>
            <DialogTitle className="font-display text-lg font-bold text-text">
              Modifier le contrat ({contract.reference})
            </DialogTitle>
            <DialogDescription className="mt-1 font-sans text-xs text-text-2">
              Modifiez à la volée les informations financières, temporelles et structurelles du contrat.
            </DialogDescription>
          </div>
        </DialogHeader>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-text">Montant Total (Prime)</label>
            <input
              type="number"
              required
              value={totalAmount}
              onChange={(e) => setTotalAmount(Number(e.target.value))}
              className="h-10 rounded-xl border border-border bg-surface-2 px-3.5 font-sans text-sm outline-none focus:border-primary text-text"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-text">Périodicité</label>
            <select
              value={periodicity}
              onChange={(e) => setPeriodicity(e.target.value)}
              className="h-10 rounded-xl border border-border bg-surface-2 px-3 font-sans text-sm outline-none focus:border-primary text-text cursor-pointer"
            >
              <option value="MONTHLY">Mensuelle</option>
              <option value="QUARTERLY">Trimestrielle</option>
              <option value="BIANNUAL">Semestrielle</option>
              <option value="ANNUAL">Annuelle</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-xs font-semibold text-text">Date Début</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 rounded-xl border border-border bg-surface-2 px-3 font-sans text-sm outline-none focus:border-primary text-text"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-xs font-semibold text-text">Date Fin</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 rounded-xl border border-border bg-surface-2 px-3 font-sans text-sm outline-none focus:border-primary text-text"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-xs font-semibold text-text">Agence Rattachée</label>
            <select
              value={agencyId}
              required
              onChange={(e) => setAgencyId(e.target.value)}
              className="h-10 rounded-xl border border-border bg-surface-2 px-3 font-sans text-sm outline-none focus:border-primary text-text cursor-pointer"
            >
              <option value="">Sélectionner une agence</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="rounded-xl border border-border bg-surface-2 px-4 py-2 font-sans text-xs font-semibold text-text hover:bg-border transition-colors cursor-pointer disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary px-5 py-2 font-sans text-xs font-semibold text-on-primary hover:bg-primary/90 transition-colors shadow-md cursor-pointer disabled:opacity-50"
            >
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
