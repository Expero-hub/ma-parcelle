"use client";

import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRICE_RANGES, SURFACE_RANGES } from "@/lib/parcelles";

export interface Filters {
  ville: string;
  statut: string;
  surface: string;
  prix: string;
}

const triggerCls =
  "h-auto rounded-[10px] border-border bg-surface px-[14px] py-[11px] font-sans text-sm font-medium text-text";

export function FiltersBar({
  filters,
  villeOptions,
  onChange,
  onReset,
}: {
  filters: Filters;
  villeOptions: string[];
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
}) {
  const [openVille, setOpenVille] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVilles = villeOptions.filter((v) =>
    v.toLowerCase().includes(searchQuery.toLowerCase().trim()),
  );

  const selectedVilleLabel =
    filters.ville === "all" ? "Toutes les villes" : filters.ville;

  const statutItems: Record<string, string> = {
    all: "Disponibilité",
    disponible: "Libre",
    reserve: "Réservé",
    vendu: "Vendu",
  };
  const surfaceItems: Record<string, string> = Object.fromEntries(
    SURFACE_RANGES.map((r) => [r.value, r.label]),
  );
  const prixItems: Record<string, string> = Object.fromEntries(
    PRICE_RANGES.map((r) => [r.value, r.label]),
  );

  return (
    <div className="flex flex-wrap gap-[10px]">
      {/* Combobox pour la recherche de Ville / Zone */}
      <Popover open={openVille} onOpenChange={setOpenVille}>
        <PopoverTrigger className={`${triggerCls} flex items-center justify-between gap-2 min-w-[170px] cursor-pointer`}>
          <span className="truncate">{selectedVilleLabel}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-text-2" />
        </PopoverTrigger>
        <PopoverContent className="w-[230px] p-2 bg-surface border border-border shadow-lg rounded-xl z-[2000]">
          {/* Input de recherche */}
          <div className="relative mb-2 flex items-center border-b border-border pb-2 px-1">
            <Search className="size-4 shrink-0 text-text-2 mr-2" />
            <input
              type="text"
              placeholder="Rechercher une ville..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent font-sans text-xs outline-none text-text placeholder:text-text-2"
            />
          </div>

          <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => {
                onChange({ ville: "all" });
                setOpenVille(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 font-sans text-xs text-text hover:bg-surface-2 text-left"
            >
              <span>Toutes les villes</span>
              {filters.ville === "all" && <Check className="size-3.5 text-primary" />}
            </button>

            {filteredVilles.length > 0 ? (
              filteredVilles.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    onChange({ ville: v });
                    setOpenVille(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 font-sans text-xs text-text hover:bg-surface-2 text-left"
                >
                  <span className="truncate">{v}</span>
                  {filters.ville === v && <Check className="size-3.5 text-primary" />}
                </button>
              ))
            ) : (
              <div className="px-2 py-3 text-center font-sans text-xs text-text-2">
                Aucune zone trouvée
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selects pour Statut, Surface, Prix */}
      <Select
        value={filters.statut}
        onValueChange={(v) => onChange({ statut: v ?? "all" })}
      >
        <SelectTrigger className={triggerCls}>
          <SelectValue>{statutItems[filters.statut]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statutItems).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.surface}
        onValueChange={(v) => onChange({ surface: v ?? "all" })}
      >
        <SelectTrigger className={triggerCls}>
          <SelectValue>{surfaceItems[filters.surface]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(surfaceItems).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.prix}
        onValueChange={(v) => onChange({ prix: v ?? "all" })}
      >
        <SelectTrigger className={triggerCls}>
          <SelectValue>{prixItems[filters.prix]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(prixItems).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        type="button"
        onClick={onReset}
        className="cursor-pointer rounded-[10px] border border-border bg-transparent px-4 py-[11px] font-sans text-sm font-medium text-text-2 transition-colors hover:border-primary hover:text-primary"
      >
        Réinitialiser
      </button>
    </div>
  );
}

