"use client";

import { useState } from "react";
import { useRouter } from "@/hooks/use-router";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { User, LandPlot, FileText, CheckCircle, XCircle } from "lucide-react";
import { fmtFCFA } from "@/lib/parcelles";

interface IntentionItem {
  id: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  parcelle: {
    id: string;
    reference: string;
    commune: string;
    price: number;
  };
  contract: {
    id: string;
    reference: string;
    totalAmount: number;
    installmentAmount: number;
    periodicity: string | null;
    durationMonths: number;
    verseInit: number;
    garantieDeces: boolean;
  } | null;
  totalPaid: number;
  isEligible: boolean;
  minRequired: number;
}

interface IntentionsListProps {
  initialItems: IntentionItem[];
}

export function IntentionsList({ initialItems }: IntentionsListProps) {
  const router = useRouter();
  const [items, setItems] = useState<IntentionItem[]>(initialItems);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const handleValidateSale = async (id: string) => {
    if (validatingId) return;

    if (!confirm("Voulez-vous vraiment valider cette acquisition ? Cette action confirmera le contrat, réservera la parcelle à ce client, et annulera toutes les autres intentions d'achat pour cette parcelle.")) {
      return;
    }

    setValidatingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}/validate`, {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.message || "Impossible de valider la vente.");
      } else {
        toast.success(json.message || "Vente validée avec succès !");
        // Recharger les données de la page
        router.refresh();
      }
    } catch (err) {
      console.error("Erreur validation:", err);
      toast.error("Une erreur réseau s'est produite.");
    } finally {
      setValidatingId(null);
    }
  };

  const getPeriodicityLabel = (p: string | null) => {
    if (!p) return "Non définie";
    if (p === "MONTHLY") return "Mensuelle";
    if (p === "QUARTERLY") return "Trimestrielle";
    if (p === "BIANNUAL") return "Semestrielle";
    return "Annuelle";
  };

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-text-2 space-y-3">
          <CheckCircle className="h-12 w-12 text-text-2/40" />
          <h3 className="font-display font-semibold text-text">Aucune intention d'achat en attente</h3>
          <p className="text-xs max-w-md">
            Toutes les demandes de souscriptions soumises par les clients ont été traitées ou validées par le staff.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/50 text-text-2 font-semibold">
                <th className="p-4">Client</th>
                <th className="p-4">Parcelle</th>
                <th className="p-4">Contrat</th>
                <th className="p-4">Financier</th>
                <th className="p-4 text-center">Éligibilité</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-surface-2/20 transition-colors">
                  {/* Client column */}
                  <td className="p-4 space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-text">
                      <User className="h-4 w-4 text-primary shrink-0" />
                      {item.user.name}
                    </div>
                    <div className="text-xs text-text-2 pl-6">{item.user.email}</div>
                    <div className="text-xs text-text-2 pl-6">{item.user.phone}</div>
                  </td>

                  {/* Parcelle column */}
                  <td className="p-4 space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-text">
                      <LandPlot className="h-4 w-4 text-secondary shrink-0" />
                      {item.parcelle.reference}
                    </div>
                    <div className="text-xs text-text-2 pl-6">{item.parcelle.commune}</div>
                    <div className="text-xs font-mono text-text-2 pl-6">{fmtFCFA(item.parcelle.price)} FCFA</div>
                  </td>

                  {/* Contrat column */}
                  <td className="p-4 space-y-1">
                    {item.contract ? (
                      <>
                        <div className="flex items-center gap-2 font-semibold text-text">
                          <FileText className="h-4 w-4 text-text-2 shrink-0" />
                          {item.contract.reference}
                        </div>
                        <div className="text-xs text-text-2 pl-6">
                          {item.contract.durationMonths} mois · {getPeriodicityLabel(item.contract.periodicity)}
                        </div>
                        <div className="text-xs text-text-2 pl-6">
                          Mensualité : {fmtFCFA(item.contract.installmentAmount)} FCFA
                        </div>
                      </>
                    ) : (
                      <span className="text-text-2 pl-6 italic">Pas de contrat</span>
                    )}
                  </td>

                  {/* Financier column */}
                  <td className="p-4 space-y-1">
                    <div className="font-semibold text-text">
                      Payé : <span className="font-mono text-secondary">{fmtFCFA(item.totalPaid)} FCFA</span>
                    </div>
                    <div className="text-xs text-text-2">
                      Requis : <span className="font-mono">{fmtFCFA(item.minRequired)} FCFA</span>
                    </div>
                    {item.contract && item.contract.verseInit > 0 && (
                      <div className="text-xs text-text-2">
                        Versement init. : {fmtFCFA(item.contract.verseInit)} FCFA
                      </div>
                    )}
                  </td>

                  {/* Éligibilité column */}
                  <td className="p-4 text-center">
                    {item.isEligible ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Éligible
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-alert/15 px-2.5 py-1 text-xs font-semibold text-alert">
                        <XCircle className="h-3.5 w-3.5" />
                        Non éligible
                      </span>
                    )}
                  </td>

                  {/* Actions column */}
                  <td className="p-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => handleValidateSale(item.id)}
                      disabled={validatingId !== null}
                      className={`font-semibold cursor-pointer ${
                        item.isEligible 
                          ? "bg-primary hover:bg-primary/95 text-on-primary"
                          : "bg-surface-2 hover:bg-surface-3 border border-border text-text-2"
                      }`}
                    >
                      {validatingId === item.id ? "Validation…" : "Valider la vente"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
