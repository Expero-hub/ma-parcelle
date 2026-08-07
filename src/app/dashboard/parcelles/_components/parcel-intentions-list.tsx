"use client";

import { useState } from "react";
import { useRouter } from "@/hooks/use-router";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { User, FileText, CheckCircle, XCircle, ShieldAlert } from "lucide-react";
import { fmtFCFA } from "@/lib/parcelles";

interface Intention {
  id: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  contract: {
    reference: string;
    totalAmount: number;
    installmentAmount: number;
    periodicity: string;
    durationMonths: number;
    verseInit: number;
  };
  totalPaid: number;
  isEligible: boolean;
  minRequired: number;
}

interface ParcelIntentionsListProps {
  intentions: Intention[];
}

export function ParcelIntentionsList({ intentions }: ParcelIntentionsListProps) {
  const router = useRouter();
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const handleValidateSale = async (id: string) => {
    if (validatingId) return;

    if (!confirm("Voulez-vous valider l'acquisition pour ce client ? Cela activera son contrat, réservera la parcelle, et annulera toutes les autres intentions d'achat concurrentes.")) {
      return;
    }

    setValidatingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}/validate`, {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.message || "Erreur de validation.");
      } else {
        toast.success(json.message || "Vente validée avec succès !");
        router.refresh();
      }
    } catch (err) {
      console.error("Erreur validation:", err);
      toast.error("Erreur réseau.");
    } finally {
      setValidatingId(null);
    }
  };

  const getPeriodicityLabel = (p: string) => {
    if (p === "MONTHLY") return "Mensuelle";
    if (p === "QUARTERLY") return "Trimestrielle";
    if (p === "BIANNUAL") return "Semestrielle";
    return "Annuelle";
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <ShieldAlert className="h-5 w-5 text-primary" />
        <h3 className="font-display font-bold text-text">Intentions d'achat ({intentions.length})</h3>
      </div>

      <div className="space-y-4 divide-y divide-border/60">
        {intentions.map((intent, idx) => (
          <div key={intent.id} className={`pt-4 ${idx === 0 ? "pt-0" : ""} space-y-3`}>
            {/* Infos Client */}
            <div className="flex items-start gap-2.5">
              <User className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <h4 className="font-bold text-text">{intent.user.name}</h4>
                <p className="text-xs text-text-2">{intent.user.email} · {intent.user.phone}</p>
              </div>
            </div>

            {/* Infos Contrat */}
            <div className="rounded-xl bg-surface-2 p-3.5 border border-border/80 text-xs space-y-2">
              <div className="flex justify-between border-b border-border/40 pb-1.5 font-semibold text-text">
                <span>Contrat Draft : {intent.contract.reference}</span>
                <span className="text-primary font-mono">{fmtFCFA(intent.contract.totalAmount)} FCFA</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-text-2">
                <div>Durée : <span className="font-semibold text-text">{intent.contract.durationMonths} mois</span></div>
                <div>Période : <span className="font-semibold text-text">{getPeriodicityLabel(intent.contract.periodicity)}</span></div>
                <div>Mensualité : <span className="font-semibold text-text font-mono">{fmtFCFA(intent.contract.installmentAmount)} FCFA</span></div>
                <div>Versement init. : <span className="font-semibold text-text font-mono">{fmtFCFA(intent.contract.verseInit)} FCFA</span></div>
              </div>
            </div>

            {/* Financier */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div>
                <span className="text-text-2 font-medium">Montant déjà versé : </span>
                <span className="font-bold text-secondary font-mono">{fmtFCFA(intent.totalPaid)} FCFA</span>
              </div>
              <div>
                {intent.isEligible ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-0.5 font-semibold text-secondary">
                    <CheckCircle className="h-3 w-3" />
                    Éligible
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-alert/15 px-2.5 py-0.5 font-semibold text-alert">
                    <XCircle className="h-3 w-3" />
                    Non éligible (min {fmtFCFA(intent.minRequired)})
                  </span>
                )}
              </div>
            </div>

            {/* Action */}
            <div className="pt-1">
              <Button
                size="sm"
                onClick={() => handleValidateSale(intent.id)}
                disabled={validatingId !== null}
                className={`w-full font-semibold cursor-pointer ${
                  intent.isEligible
                    ? "bg-primary hover:bg-primary/95 text-on-primary"
                    : "bg-surface-2 hover:bg-surface-3 border border-border text-text-2"
                }`}
              >
                {validatingId === intent.id ? "Validation en cours…" : "Valider l'acquisition"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
