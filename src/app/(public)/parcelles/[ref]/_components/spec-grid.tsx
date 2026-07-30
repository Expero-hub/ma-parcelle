import {
  STATUT_META,
  fmtFCFA,
  pricePerM2,
  type Parcelle,
} from "@/lib/parcelles";

export function SpecGrid({ p }: { p: Parcelle }) {
  const specs = [
    { k: "Superficie", v: `${p.surf} m²` },
    { k: "Financement sur 7 ans", v: `${fmtFCFA(p.monthlyPayment7Years ?? 0)} F/mois` },
    { k: "Ville", v: p.ville },
    { k: "Quartier", v: p.quartier },
    { k: "Statut", v: STATUT_META[p.statut].label },
    { k: "Paiement", v: p.paiement },
  ];

  return (
    <div>
      <h3 className="mb-[14px] font-display text-lg leading-[1.2] font-semibold">
        Caractéristiques
      </h3>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-px overflow-hidden rounded-[14px] border border-border bg-border">
        {specs.map((sp) => (
          <div key={sp.k} className="bg-surface px-[18px] py-4">
            <div className="mb-[6px] font-sans text-xs text-text-2">{sp.k}</div>
            <div className="font-mono text-[15px] leading-[1.2] font-semibold text-text">
              {sp.v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
