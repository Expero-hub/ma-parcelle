"use client";

import { useState } from "react";

import { useRouter } from "@/hooks/use-router";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const VILLES = [
  "Toutes les villes",
  "Cotonou",
  "Abomey-Calavi",
  "Porto-Novo",
  "Ouidah",
  "Sèmè-Kpodji",
];
const SURFACES = [
  "Toutes surfaces",
  "200 – 400 m²",
  "400 – 600 m²",
  "600 – 1000 m²",
  "1000 m² et +",
];
const BUDGETS = [
  "Tous budgets",
  "< 5 M FCFA",
  "5 – 10 M FCFA",
  "10 – 20 M FCFA",
  "20 M+ FCFA",
];

function Field({
  label,
  options,
}: {
  label: string;
  options: string[];
}) {
  const [value, setValue] = useState(options[0]);
  return (
    <label className="flex flex-col gap-[6px]">
      <span className="font-sans text-xs font-medium text-text-2">{label}</span>
      <Select
        value={value}
        onValueChange={(v) => setValue((v as string) ?? options[0])}
      >
        <SelectTrigger className="h-auto w-full rounded-lg border-border bg-surface-2 px-[14px] py-3 font-sans text-sm font-medium text-text">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

export function HeroSearch() {
  const router = useRouter();
  const [comptant, setComptant] = useState(false);

  const seg =
    "rounded-lg border-none px-4 py-[9px] font-sans text-[13px] font-semibold transition-all cursor-pointer";
  const segOn = "bg-surface text-text shadow-[var(--shadow)]";
  const segOff = "bg-transparent text-text-2";

  return (
    <div className="mt-8 rounded-2xl bg-surface p-[18px] text-text shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-2 px-1 pt-[2px] pb-3 font-mono text-[11px] font-medium tracking-[0.08em] text-text-2">
        <span className="size-[6px] rounded-full bg-secondary" />
        RECHERCHER UNE PARCELLE
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[10px]">
        <Field label="Ville" options={VILLES} />
        <Field label="Superficie" options={SURFACES} />
        <Field label="Budget" options={BUDGETS} />
      </div>

      <div className="mt-[14px] flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-[10px] border border-border bg-surface-2 p-1">
          <button
            type="button"
            onClick={() => setComptant(true)}
            className={`${seg} ${comptant ? segOn : segOff}`}
          >
            Comptant
          </button>
          <button
            type="button"
            onClick={() => setComptant(false)}
            className={`${seg} ${!comptant ? segOn : segOff}`}
          >
            Échelonné
          </button>
        </div>
        <Button
          onClick={() => router.push("/parcelles")}
          className="h-auto min-w-[150px] flex-1 gap-[10px] rounded-[10px] px-[22px] py-[14px] font-sans text-[15px] font-semibold shadow-[var(--shadow)] hover:-translate-y-px hover:shadow-[var(--shadow-hover)]"
        >
          <span className="size-2 rounded-full border-[1.5px] border-on-primary" />
          Rechercher
        </Button>
      </div>
    </div>
  );
}
