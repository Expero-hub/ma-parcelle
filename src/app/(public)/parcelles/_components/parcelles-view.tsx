"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  PRICE_RANGES,
  SURFACE_RANGES,
  inRange,
  type Parcelle,
} from "@/lib/parcelles";
import { FiltersBar, type Filters } from "./filters-bar";
import { ParcelleListCard } from "./parcelle-list-card";

const PAGE_SIZE = 4;

const DEFAULT_FILTERS: Filters = {
  ville: "all",
  statut: "all",
  surface: "all",
  prix: "all",
};

// Leaflet touche `window` → chargement client uniquement.
const CadastreMap = dynamic(
  () => import("./cadastre-map").then((m) => m.CadastreMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-surface-2 font-mono text-xs text-text-2">
        Chargement de la carte…
      </div>
    ),
  },
);

export function ParcellesView({
  parcelles,
  zoneNames,
}: {
  parcelles: Parcelle[];
  zoneNames?: string[];
}) {
  const searchParams = useSearchParams();

  const initialFilters = useMemo<Filters>(() => {
    return {
      ville: searchParams.get("ville") || "all",
      statut: searchParams.get("statut") || "all",
      surface: searchParams.get("surface") || "all",
      prix: searchParams.get("prix") || "all",
    };
  }, [searchParams]);

  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Sync state if URL search parameters change (e.g. from hero search)
  useEffect(() => {
    setFilters(initialFilters);
    setPage(1);
  }, [initialFilters]);

  const filtered = useMemo(
    () =>
      parcelles.filter(
        (p) =>
          (filters.ville === "all" || p.ville === filters.ville) &&
          (filters.statut === "all" || p.statut === filters.statut) &&
          inRange(SURFACE_RANGES, filters.surface, p.surf) &&
          inRange(PRICE_RANGES, filters.prix, p.price),
      ),
    [parcelles, filters],
  );

  const villeOptions = useMemo(
    () =>
      zoneNames && zoneNames.length > 0
        ? Array.from(new Set([...zoneNames, ...parcelles.map((p) => p.ville)]))
        : Array.from(new Set(parcelles.map((p) => p.ville))),
    [parcelles, zoneNames],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clampe la page courante (dérivé) plutôt qu'un effet, si le filtrage a
  // réduit le nombre de pages.
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const patchFilters = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  // Sélection depuis la carte → basculer sur la page qui contient la parcelle.
  const selectParcelle = (ref: string) => {
    setSelectedId(ref);
    const idx = filtered.findIndex((p) => p.ref === ref);
    if (idx >= 0) setPage(Math.floor(idx / PAGE_SIZE) + 1);
  };

  return (
    <div className="mx-auto max-w-[1400px] overflow-x-clip px-[clamp(16px,4vw,64px)] pt-[clamp(20px,3vw,32px)] pb-12">
      {/* header */}
      <div className="mb-4">
        <div className="mb-3 font-mono text-xs font-medium tracking-[0.14em] text-primary">
          DÉCOUVRIR · {filtered.length} PARCELLE{filtered.length > 1 ? "S" : ""}
        </div>
        <h1 className="m-0 font-display text-[clamp(30px,4vw,42px)] leading-[1.05] font-semibold tracking-[-0.02em]">
          Parcelles
        </h1>
      </div>

      <div className="mb-5">
        <FiltersBar
          filters={filters}
          villeOptions={villeOptions}
          onChange={patchFilters}
          onReset={() => {
            setFilters(DEFAULT_FILTERS);
            setPage(1);
          }}
        />
      </div>

      {/* split : liste (gauche) + carte (droite, plus grande) */}
      <div className="grid gap-5 lg:grid-cols-[minmax(360px,430px)_1fr]">
        {/* liste + pagination */}
        <div className="order-2 flex flex-col lg:order-1">
          {filtered.length > 0 ? (
            <>
              <div className="flex flex-col gap-3">
                {pageItems.map((p) => (
                  <ParcelleListCard
                    key={p.ref}
                    p={p}
                    selected={selectedId === p.ref}
                    onSelect={selectParcelle}
                    onHover={setHoverId}
                  />
                ))}
              </div>

              {pageCount > 1 && (
                <Pagination
                  page={currentPage}
                  pageCount={pageCount}
                  onPage={setPage}
                />
              )}
            </>
          ) : (
            <EmptyState
              onReset={() => {
                setFilters(DEFAULT_FILTERS);
                setPage(1);
              }}
            />
          )}
        </div>

        {/* carte cadastrale */}
        <div className="order-1 h-[340px] overflow-hidden rounded-2xl border border-border shadow-[var(--shadow)] sm:h-[440px] lg:order-2 lg:sticky lg:top-[92px] lg:h-[calc(100vh-200px)]">
          <CadastreMap
            parcelles={filtered}
            selectedId={selectedId}
            hoverId={hoverId}
            onSelect={selectParcelle}
            onHover={setHoverId}
          />
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
}) {
  const btn =
    "flex size-9 items-center justify-center rounded-lg border border-border font-sans text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button
        type="button"
        className={`${btn} cursor-pointer bg-surface text-text-2 hover:border-primary hover:text-primary`}
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        aria-label="Page précédente"
      >
        ←
      </button>
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPage(n)}
          aria-current={n === page}
          className={`${btn} cursor-pointer ${
            n === page
              ? "border-primary bg-primary text-on-primary"
              : "bg-surface text-text-2 hover:border-primary hover:text-primary"
          }`}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        className={`${btn} cursor-pointer bg-surface text-text-2 hover:border-primary hover:text-primary`}
        onClick={() => onPage(page + 1)}
        disabled={page === pageCount}
        aria-label="Page suivante"
      >
        →
      </button>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-12 px-6 text-center font-sans text-[15px] leading-[1.5] text-text-2">
      Aucune parcelle ne correspond à ces filtres.
      <br />
      <button
        type="button"
        onClick={onReset}
        className="mt-[14px] cursor-pointer rounded-[10px] bg-primary px-[18px] py-[11px] font-sans text-sm font-semibold text-on-primary"
      >
        Réinitialiser
      </button>
    </div>
  );
}
