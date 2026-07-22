import Link from "next/link";

import { STATUT_META, type Parcelle } from "@/lib/parcelles";

export function DetailHeader({ p }: { p: Parcelle }) {
  const meta = STATUT_META[p.statut];
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-[10px]">
        <Link
          href="/parcelles"
          className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-border bg-surface px-[15px] py-[10px] font-sans text-sm font-medium text-text transition-colors hover:border-primary hover:text-primary"
        >
          ← Retour aux parcelles
        </Link>
        <span className="font-mono text-[13px] text-text-2">
          Parcelles / {p.ref}
        </span>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <span
            className="rounded-full px-[11px] py-[6px] font-mono text-[11px] font-medium tracking-[0.05em]"
            style={{ background: meta.badgeBg, color: meta.badgeFg }}
          >
            {meta.label}
          </span>
          {p.verifie && (
            <span className="inline-flex items-center gap-[6px] rounded-full border border-[color-mix(in_srgb,var(--gold)_50%,transparent)] px-[10px] py-[6px] font-mono text-[11px] font-medium text-gold">
              <span className="size-[6px] rounded-full bg-gold" />
              TITRE VÉRIFIÉ
            </span>
          )}
        </div>
        <h1 className="mb-1 font-display text-[clamp(28px,3.5vw,38px)] leading-[1.1] font-semibold tracking-[-0.02em]">
          {p.ville} · {p.quartier}
        </h1>
        <span className="font-mono text-sm text-text-2">{p.coord}</span>
      </div>
    </>
  );
}
