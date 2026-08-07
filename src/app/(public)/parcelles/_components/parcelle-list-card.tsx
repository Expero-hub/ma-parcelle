"use client";

import Image from "next/image";
import { useRouter } from "@/hooks/use-router";
import {
  STATUT_META,
  ctaLabel,
  fmtFCFA,
  pricePerM2,
  type Parcelle,
} from "@/lib/parcelles";

const HATCH =
  "repeating-linear-gradient(135deg,var(--surface-2),var(--surface-2) 8px,transparent 8px,transparent 16px),var(--bg)";

/**
 * Carte parcelle façon annonce (panneau liste du catalogue). Layout horizontal
 * compact : vignette à gauche, infos (badge, prix, superficie…) à droite.
 * Cliquer la carte la sélectionne (mise en avant sur la carte cartographique) ;
 * le bouton « Voir / Réserver » ouvre la page détail.
 */
export function ParcelleListCard({
  p,
  selected,
  onSelect,
  onHover,
}: {
  p: Parcelle;
  selected: boolean;
  onSelect: (ref: string) => void;
  onHover: (ref: string | null) => void;
}) {
  const router = useRouter();
  const meta = STATUT_META[p.statut];

  return (
    <article
      onClick={() => onSelect(p.ref)}
      onMouseEnter={() => onHover(p.ref)}
      onMouseLeave={() => onHover(null)}
      className={`group flex cursor-pointer overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)] ${
        selected
          ? "ring-2 ring-primary"
          : "ring-1 ring-border hover:ring-primary/40"
      }`}
    >
      {/* vignette */}
      <div className="relative w-[112px] flex-none border-r border-border sm:w-[132px] bg-surface-2 overflow-hidden">
        <Image
          src={p.images && p.images.length > 0 ? p.images[0] : "/images/hero/hero4.jpg"}
          alt={`Parcelle ${p.ref}`}
          fill
          sizes="(max-width: 640px) 112px, 132px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span
          className="absolute top-2 left-2 size-3 rounded-full shadow-[0_0_0_3px_color-mix(in_srgb,var(--surface)_80%,transparent)] z-10"
          style={{ background: meta.color }}
        />
        {p.verifie && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] px-2 py-1 font-mono text-[9px] font-medium tracking-[0.04em] text-gold backdrop-blur-[4px] z-10">
            <span className="size-[5px] rounded-full bg-gold" />
            VÉRIFIÉ
          </span>
        )}
      </div>

      {/* infos */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-[14px]">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-medium text-text-2">
            {p.ref}
          </span>
          <span
            className="rounded-full px-[9px] py-1 font-mono text-[10px] font-medium tracking-[0.05em]"
            style={{ background: meta.badgeBg, color: meta.badgeFg }}
          >
            {meta.label}
          </span>
        </div>

        <div className="min-w-0">
          <h3 className="truncate font-display text-[17px] leading-[1.2] font-semibold">
            {p.ville}
          </h3>
          <span className="font-sans text-[12.5px] text-text-2">
            {p.quartier}
          </span>
          {meta.avail && p.interestCount !== undefined && p.interestCount > 0 && (
            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {p.interestCount} {p.interestCount > 1 ? "intéressés" : "intéressé"}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-md bg-surface-2 px-2 py-1 font-sans text-[11px] font-medium text-text-2">
            {p.surf} m²
          </span>
          <span className="rounded-md bg-surface-2 px-2 py-1 font-sans text-[11px] font-medium text-text-2">
            {p.paiement}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-border pt-2.5">
          <div className="min-w-0">
            <div className="font-mono text-[16px] font-semibold text-text">
              {fmtFCFA(p.monthlyPayment7Years ?? 0)}{" "}
              <span className="text-[10px] text-text-2">F/mois sur 7 ans</span>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/parcelles/${encodeURIComponent(p.ref)}`);
            }}
            className={`cursor-pointer rounded-lg px-3 py-2 font-sans text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
              meta.avail
                ? "bg-primary text-on-primary hover:brightness-105"
                : "border border-border bg-transparent text-text-2 hover:border-primary hover:text-primary"
            }`}
          >
            {ctaLabel(p)}
          </button>
        </div>
      </div>
    </article>
  );
}
