"use client";

import { useState, useEffect } from "react";
import { Grid, List, MoreHorizontal, Plus, Search, ChevronDown, Check, ChevronsUpDown, Heart } from "lucide-react";
import Link from "next/link";

import { useRouter } from "@/hooks/use-router";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/paginated-table-wrapper";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { http } from "@/lib/http";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  reference: string;
  area: number;
  price: number;
  status: "AVAILABLE" | "RESERVED" | "SOLD";
  minDuration: number;
  maxDuration: number;
  commune: string;
  district: string;
  department: string;
  fullAddress: string;
  pointOfSaleName: string;
  agencyName: string;
  imageUrl: string | null;
  recoveryRate: number;
};

type Option = { id: string; name: string };

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponible",
  RESERVED: "Réservée",
  SOLD: "Vendue",
};

export function ParcellesList({
  initialRows,
  initialTotalCount,
  pointsOfSale,
  canCreate,
}: {
  initialRows: Row[];
  initialTotalCount: number;
  pointsOfSale: Option[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Data states
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [totalResults, setTotalResults] = useState(initialTotalCount);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Filters
  const [pointOfSaleId, setPointOfSaleId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [posOpen, setPosOpen] = useState(false);

  // Deletion confirm dialog
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isFirstRender, setIsFirstRender] = useState(true);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(q);
    }, 300);
    return () => clearTimeout(handler);
  }, [q]);

  // Reset page to 1 on filters change
  useEffect(() => {
    if (!isFirstRender) {
      setPage(1);
    }
  }, [debouncedQuery, pointOfSaleId, status, pageSize]);

  // Fetch paginated and filtered data
  useEffect(() => {
    if (isFirstRender) {
      setIsFirstRender(false);
      return;
    }

    let active = true;
    async function loadData() {
      try {
        const url = `/parcelles?page=${page}&limit=${pageSize}&q=${encodeURIComponent(
          debouncedQuery
        )}&pointOfSaleId=${pointOfSaleId}&status=${status}`;
        const res = await http.get<{
          data: any[];
          meta: { total: number };
        }>(url);

        if (active) {
          setRows(res.data.data);
          setTotalResults(res.data.meta.total);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [page, pageSize, debouncedQuery, pointOfSaleId, status]);

  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));

  async function handleDelete(id: string) {
    setDeleteConfirm(id);
  }

  async function onConfirmDelete() {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await http.delete(`/parcelles/${deleteConfirm}`);
      setRows((current) => current.filter((r) => r.id !== deleteConfirm));
      setTotalResults((prev) => Math.max(0, prev - 1));
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  }

  function formatPrice(p: number) {
    return new Intl.NumberFormat("fr-FR").format(p) + " FCFA";
  }

  // Circular gauge component
  function CircularProgress({ percentage, className }: { percentage: number; className?: string }) {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    return (
      <div className={cn("flex items-center gap-2 rounded-lg bg-surface/95 px-2 py-1 shadow-sm border border-border backdrop-blur-xs", className)}>
        <svg className="h-8 w-8 -rotate-90">
          <circle cx="16" cy="16" r={radius} className="stroke-border" strokeWidth="3" fill="transparent" />
          <circle
            cx="16"
            cy="16"
            r={radius}
            className="stroke-primary transition-all duration-300"
            strokeWidth="3"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="text-[10px] leading-tight">
          <div className="font-bold text-text">{percentage}%</div>
          <div className="text-text-2 font-medium text-[8px] uppercase tracking-wider">recouvr.</div>
        </div>
      </div>
    );
  }

  const selectedPos = pointsOfSale.find((p) => p.id === pointOfSaleId);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-text-2">Tableau de bord / Gestion-des-parcelles</p>
          <h1 className="font-display text-2xl font-bold text-text">Gestion des parcelles</h1>
          <p className="text-xs text-text-2 mt-1">
            {totalResults} parcelles · {rows.filter((r) => r.status === "AVAILABLE").length} disponibles
          </p>
        </div>
        {canCreate && (
          <Link
            href="/dashboard/parcelles/ajout"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary/95 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ajouter une parcelle
          </Link>
        )}
      </div>

      {/* FILTER & CONTROL BAR */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-surface p-4 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-3">
          {/* SEARCH BAR */}
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-2" />
            <Input
              placeholder="Rechercher par référence..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* COMBODOBX POINT OF SALE FILTER */}
          <Popover open={posOpen} onOpenChange={setPosOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text hover:bg-surface-2/80 transition-colors"
                />
              }
            >
              <span>{selectedPos ? selectedPos.name : "Tous les points de vente"}</span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-text-2" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-(--anchor-width) min-w-64 p-0">
              <Command>
                <CommandInput placeholder="Rechercher un point de vente..." />
                <CommandList className="max-h-56">
                  <CommandEmpty>Aucun point de vente trouvé.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        setPointOfSaleId("");
                        setPosOpen(false);
                      }}
                    >
                      <Check className={cn("h-4 w-4 mr-2", !pointOfSaleId ? "opacity-100" : "opacity-0")} />
                      Tous les points de vente
                    </CommandItem>
                    {pointsOfSale.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={p.name}
                        onSelect={() => {
                          setPointOfSaleId(p.id);
                          setPosOpen(false);
                        }}
                      >
                        <Check
                          className={cn("h-4 w-4 mr-2", pointOfSaleId === p.id ? "opacity-100" : "opacity-0")}
                        />
                        {p.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* STATUS FILTER */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:outline-hidden"
          >
            <option value="">Tous les statuts</option>
            <option value="AVAILABLE">Disponible</option>
            <option value="RESERVED">Réservée</option>
            <option value="SOLD">Vendue</option>
          </select>
        </div>

        {/* LAYOUT SWAP BUTTONS */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1 self-start sm:self-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === "grid" ? "bg-surface text-primary shadow-xs" : "text-text-2 hover:text-text"
            )}
            title="Affichage en Grille"
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === "table" ? "bg-surface text-primary shadow-xs" : "text-text-2 hover:text-text"
            )}
            title="Affichage en Tableau"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* RENDER LISTINGS */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface py-16 text-center text-text-2">
          Aucune parcelle trouvée.
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW LAYOUT */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div
              key={r.id}
              onClick={() => router.push(`/dashboard/parcelles/${r.id}`)}
              className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-surface shadow-xs transition-all hover:-translate-y-1 hover:shadow-md"
            >
              {/* Image box */}
              <div className="relative h-48 bg-surface-2">
                {r.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.imageUrl}
                    alt={r.reference}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-text-2 uppercase">
                    Photo indisponible
                  </div>
                )}

                {/* Status Badge */}
                <span
                  className={cn(
                    "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white uppercase",
                    r.status === "AVAILABLE" && "bg-secondary",
                    r.status === "RESERVED" && "bg-gold text-on-gold",
                    r.status === "SOLD" && "bg-alert"
                  )}
                >
                  {STATUS_LABELS[r.status]}
                </span>

                {/* Circular recovery indicator */}
                {r.status !== "AVAILABLE" && (
                  <CircularProgress percentage={r.recoveryRate} className="absolute bottom-3 right-3" />
                )}
              </div>

              {/* Text content */}
              <div className="p-5">
                <h3 className="font-display text-lg font-bold text-text group-hover:text-primary transition-colors">
                  {r.reference}
                </h3>
                <p className="text-xs text-text-2 mt-1">
                  {r.commune ? `${r.commune}, ${r.department}` : "Localisation cadastrale non définie"}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <div>
                    <span className="text-xs font-semibold text-text-2 block">PRIX</span>
                    <span className="text-base font-bold text-primary">{formatPrice(r.price)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-text-2 block">SUPERFICIE</span>
                    <span className="text-sm font-bold text-text">{r.area} m²</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-semibold text-text-2 border border-border">
                    {r.agencyName}
                  </span>
                  
                  {/* Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-lg p-1.5 text-text-2 hover:bg-surface-2"
                        />
                      }
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/parcelles/${r.id}`)}>
                        Voir les détails
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/parcelles/${r.id}/modifier`)}>
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/reservations/nouveau?parcelleId=${r.id}`)}>
                        Faire une réservation
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDelete(r.id)} className="text-alert">
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW LAYOUT */
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-xs">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-surface-2 text-text-2 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold">Libellé</th>
                <th className="px-4 py-3 font-semibold">Localisation</th>
                <th className="px-4 py-3 font-semibold">Superficie</th>
                <th className="px-4 py-3 font-semibold">Prix</th>
                <th className="px-4 py-3 font-semibold">Agence</th>
                <th className="px-4 py-3 font-semibold">Recouvr.</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-text">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/dashboard/parcelles/${r.id}`)}
                  className="cursor-pointer transition-colors hover:bg-surface-2/60"
                >
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2">
                        {r.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.imageUrl} alt={r.reference} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[8px] text-text-2 uppercase">
                            No pic
                          </div>
                        )}
                      </div>
                      <span className="truncate max-w-[180px]" title={r.reference}>
                        {r.reference}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-2">
                    <div className="truncate max-w-[150px]" title={r.commune}>
                      {r.commune}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-text-2">{r.area} m²</td>
                  <td className="px-4 py-3 font-semibold text-primary">{formatPrice(r.price)}</td>
                  <td className="px-4 py-3 text-text-2">{r.agencyName}</td>
                  <td className="px-4 py-3">
                    {r.status !== "AVAILABLE" ? (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        <span className="font-mono text-xs font-semibold">{r.recoveryRate}%</span>
                      </div>
                    ) : (
                      <span className="text-text-2">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        r.status === "AVAILABLE" && "bg-secondary/15 text-secondary",
                        r.status === "RESERVED" && "bg-gold/15 text-gold-2",
                        r.status === "SOLD" && "bg-alert/15 text-alert"
                      )}
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button className="rounded-lg p-1.5 text-text-2 hover:bg-surface-2" />
                        }
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/parcelles/${r.id}`)}>
                          Voir les détails
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/parcelles/${r.id}/modifier`)}>
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/reservations/nouveau?parcelleId=${r.id}`)}>
                          Faire une réservation
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(r.id)} className="text-alert">
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PAGINATION WRAPPER */}
      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        totalResults={totalResults}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />

      {/* DELETION DIALOG */}
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Supprimer la parcelle ?"
        description="Cette parcelle sera masquée des listes et archivée. L'historique des réservations ou contrats existants sera conservé."
        confirmLabel="Supprimer la parcelle"
        destructive
        loading={isDeleting}
        onConfirm={onConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
export default ParcellesList;
