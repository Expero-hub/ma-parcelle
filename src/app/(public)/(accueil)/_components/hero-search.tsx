"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { useRouter } from "@/hooks/use-router";
import { Button } from "@/components/ui/button";
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

export function HeroSearch({ zoneNames = [] }: { zoneNames?: string[] }) {
  const router = useRouter();
  const [ville, setVille] = useState("all");
  const [surface, setSurface] = useState("all");
  const [prix, setPrix] = useState("all");

  const [openVille, setOpenVille] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const villeOptions = zoneNames.length > 0 ? zoneNames : [
    "Cotonou",
    "Abomey-Calavi",
    "Porto-Novo",
    "Ouidah",
    "Sèmè-Kpodji"
  ];

  const filteredVilles = villeOptions.filter((v) =>
    v.toLowerCase().includes(searchQuery.toLowerCase().trim()),
  );

  const selectedVilleLabel =
    ville === "all" ? "Villes" : ville;

  const triggerCls =
    "h-auto rounded-lg border border-border bg-surface-2 px-[14px] py-2 font-sans text-sm font-medium text-text w-full text-left flex items-center justify-between gap-2 cursor-pointer";

  const surfaceItems: Record<string, string> = Object.fromEntries(
    SURFACE_RANGES.map((r) => [r.value, r.label]),
  );
  const prixItems: Record<string, string> = Object.fromEntries(
    PRICE_RANGES.map((r) => [r.value, r.label]),
  );

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (ville !== "all") params.set("ville", ville);
    if (surface !== "all") params.set("surface", surface);
    if (prix !== "all") params.set("prix", prix);
    router.push(`/parcelles?${params.toString()}`);
  };

  return (
    <div className="mt-8 rounded-2xl bg-surface p-[18px] text-text shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-border">
      <div className="flex items-center gap-2 px-1 pt-[2px] pb-3 font-mono text-[11px] font-medium tracking-[0.08em] text-text-2">
        <span className="size-[6px] rounded-full bg-secondary" />
        RECHERCHER UNE PARCELLE
      </div>

      <div className="flex flex-col gap-[10px] items-end">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px] w-full">
          {/* Ville Field */}
        <div className="flex flex-col gap-[6px] flex-1 w-full">
          <span className="font-sans text-xs font-medium text-text-2">Ville</span>
          <Popover open={openVille} onOpenChange={setOpenVille}>
            <PopoverTrigger className={triggerCls}>
              <span className="truncate">{selectedVilleLabel}</span>
              <ChevronsUpDown className="size-4 shrink-0 text-text-2" />
            </PopoverTrigger>
            <PopoverContent className="w-[230px] p-2 bg-surface border border-border shadow-lg rounded-xl z-[2000]">
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
                    setVille("all");
                    setOpenVille(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 font-sans text-xs text-text hover:bg-surface-2 text-left"
                >
                  <span>Toutes les villes</span>
                  {ville === "all" && <Check className="size-3.5 text-primary" />}
                </button>
                {filteredVilles.length > 0 ? (
                  filteredVilles.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setVille(v);
                        setOpenVille(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 font-sans text-xs text-text hover:bg-surface-2 text-left"
                    >
                      <span className="truncate">{v}</span>
                      {ville === v && <Check className="size-3.5 text-primary" />}
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
        </div>

        {/* Superficie Field */}
        <div className="flex flex-col gap-[6px] flex-1 w-full">
          <span className="font-sans text-xs font-medium text-text-2">Superficie</span>
          <Select value={surface} onValueChange={(v) => setSurface(v ?? "all")}>
            <SelectTrigger className="h-auto w-full rounded-lg border border-border bg-surface-2 px-[14px] py-3 font-sans text-sm font-medium text-text flex items-center justify-between gap-2">
              <SelectValue>{surfaceItems[surface]}</SelectValue>
            </SelectTrigger>
            <SelectContent className="z-[2000]">
              {Object.entries(surfaceItems).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Budget Field */}
        <div className="flex flex-col gap-[6px] flex-1 w-full">
          <span className="font-sans text-xs font-medium text-text-2">Budget</span>
          <Select value={prix} onValueChange={(v) => setPrix(v ?? "all")}>
            <SelectTrigger className="h-auto w-full rounded-lg border border-border bg-surface-2 px-[14px] py-3 font-sans text-sm font-medium text-text flex items-center justify-between gap-2">
              <SelectValue>{prixItems[prix]}</SelectValue>
            </SelectTrigger>
            <SelectContent className="z-[2000]">
              {Object.entries(prixItems).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        </div>

       <div>
         {/* Rechercher Button */}
        <Button
          onClick={handleSearch}
          className="h-[46px] min-w-[150px] w-full md:w-auto gap-[10px] rounded-lg px-[22px] font-sans text-[15px] font-semibold shadow-[var(--shadow)] hover:-translate-y-px hover:shadow-[var(--shadow-hover)] cursor-pointer shrink-0"
        >
          <span className="size-2 rounded-full border-[1.5px] border-on-primary" />
          Rechercher
        </Button>
       </div>
      </div>
    </div>
  );
}
