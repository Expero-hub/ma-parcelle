"use client";

import dynamic from "next/dynamic";
import { type Parcelle } from "@/lib/parcelles";
import { DocumentsList } from "@/app/(public)/parcelles/[ref]/_components/documents-list";

const CadastreMap = dynamic(
  () => import("../../_components/cadastre-map").then((m) => m.CadastreMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-surface-2 font-mono text-xs text-text-2">
        Chargement de la carte…
      </div>
    ),
  },
);

/** Carte de localisation de la parcelle + description. */
export function CadastralPlan({ p }: { p: Parcelle }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] items-start gap-5">
      <div>
        <h3 className="mb-3 font-display text-lg leading-[1.2] font-semibold">
          Plan cadastral
        </h3>
        <div className="aspect-square overflow-hidden rounded-[14px] border border-border bg-surface-2">
          <CadastreMap
            parcelles={[p]}
            selectedId={p.ref}
            hoverId={null}
            onSelect={() => {}}
            onHover={() => {}}
          />
        </div>
      </div>
      <div>
      <DocumentsList p={p} />
      
      </div>
    </div>
  );
}
