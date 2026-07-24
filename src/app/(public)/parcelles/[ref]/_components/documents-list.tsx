import { Check } from "lucide-react";

import type { Parcelle } from "@/lib/parcelles";

export function DocumentsList({ p }: { p: Parcelle }) {
  const docs = [
    { name: "Titre foncier (TF) individuel", ok: p.verifie },
    { name: "Plan de bornage géomètre", ok: p.verifie },
    { name: "Certificat de propriété", ok: p.verifie },
    { name: "Contrat de vente type", ok: true },
    { name: "Quitus fiscal", ok: false },
  ];

  return (
    <div>
      <h3 className="mb-[14px] font-display text-lg leading-[1.2] font-semibold">
        Documents disponibles
      </h3>
      <div className="flex flex-col gap-2">
        {docs.map((d) => (
          <div
            key={d.name}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-[13px]"
          >
            <span
              className="flex size-[26px] flex-none items-center justify-center rounded-full bg-secondary text-white"
            >
             <Check className="size-[14px]" strokeWidth={3} />
            </span>
            <span className="flex-1 font-sans text-[14.5px] leading-[1.3] font-medium text-text">
              {d.name}
            </span>
            
          </div>
        ))}
      </div>
    </div>
  );
}
