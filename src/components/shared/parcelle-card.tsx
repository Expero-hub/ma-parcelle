import Link from "next/link";

import { Card } from "@/components/ui/card";
import { STATUT_META, ctaLabel, fmtFCFA, type Parcelle } from "@/lib/parcelles";

const HATCH =
  "repeating-linear-gradient(135deg,var(--surface-2),var(--surface-2) 10px,transparent 10px,transparent 20px),var(--bg)";

/** Carte parcelle « à la une » (accueil) et grille du catalogue. */
export function ParcelleCard({ p }: { p: Parcelle }) {
  const meta = STATUT_META[p.statut];

  return (
    <Card className="group/pc gap-0 rounded-2xl p-0 shadow-[var(--shadow)] ring-1 ring-border transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-hover)]">
      <Link href={`/parcelles/${p.ref}`} className="flex h-full flex-col">
        {/* image placeholder */}
        <div
          className="relative aspect-[16/10] border-b border-border"
          style={{ background: HATCH }}
        >
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] text-text-2 opacity-60">
            vue-terrain
          </div>
          <span
            className="absolute top-3 left-3 rounded-full px-[11px] py-[6px] font-mono text-[11px] font-medium tracking-[0.05em]"
            style={{ background: meta.badgeBg, color: meta.badgeFg }}
          >
            {meta.label.toUpperCase()}
          </span>
          <span className="absolute top-3 right-3 rounded-full border border-border bg-surface px-[10px] py-[6px] font-mono text-[10px] font-medium text-text">
            {p.ref}
          </span>
        </div>

        {/* body */}
        <div className="flex flex-1 flex-col gap-3 p-[18px]">
          <div>
            <h3 className="mb-1 font-display text-xl font-semibold">
              {p.ville}
            </h3>
            <span className="font-sans text-[13px] font-medium text-text-2">
              {p.quartier}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg bg-surface-2 px-[10px] py-[6px] font-sans text-xs font-medium text-text-2">
              {p.surf} m²
            </span>
            <span className="rounded-lg bg-surface-2 px-[10px] py-[6px] font-sans text-xs font-medium text-text-2">
              {p.paiement}
            </span>
            {p.verifie && (
              <span className="inline-flex items-center gap-[6px] rounded-lg border border-[color-mix(in_srgb,var(--gold)_50%,transparent)] px-[10px] py-[6px] font-mono text-xs font-medium text-gold">
                <span className="size-[6px] rounded-full bg-gold" />
                TITRE VÉRIFIÉ
              </span>
            )}
          </div>

          <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-[6px]">
            <div className="pt-3">
              <div className="mb-1 font-sans text-[11px] text-text-2">Prix</div>
              <div className="font-mono text-[19px] font-semibold text-text">
                {fmtFCFA(p.price)}{" "}
                <span className="text-[11px] text-text-2">FCFA</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-[7px] pt-3 font-sans text-sm font-semibold text-primary transition-all group-hover/pc:gap-[11px]">
              {ctaLabel(p)} <span className="font-mono">→</span>
            </span>
          </div>
        </div>
      </Link>
    </Card>
  );
}
