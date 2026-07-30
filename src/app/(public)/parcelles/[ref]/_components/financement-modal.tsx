"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Calculator, X, Phone, Mail, MapPin } from "lucide-react";
import { fmtFCFA, type Parcelle } from "@/lib/parcelles";
import { simulerPrimeParcelle } from "@/lib/simulation/simulation";
import { FrequencePaiement, SimulationResult } from "@/lib/simulation/simulation.types";

interface FinancementModalProps {
  parcelle: Parcelle;
}

export function FinancementModal({ parcelle }: FinancementModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const minDur = parcelle.minDuration ?? 1;
  const maxDur = parcelle.maxDuration ?? 5;

  const [duration, setDuration] = useState<number>(minDur);
  const [frequency, setFrequency] = useState<FrequencePaiement | "">("");
  const [age, setAge] = useState<number | "">(35);
  const [priseEnChargeFraisMutation, setPriseEnChargeFraisMutation] = useState<boolean>(false);
  const [garantieDeces, setGarantieDeces] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleReset = () => {
    setDuration(minDur);
    setFrequency("");
    setAge(35);
    setPriseEnChargeFraisMutation(false);
    setGarantieDeces(false);
    setSimulationResult(null);
    setErrorMsg(null);
  };

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!frequency) {
      setErrorMsg("Veuillez sélectionner une fréquence de paiement.");
      return;
    }
    if (age === "" || Number(age) < 18 || Number(age) > 100) {
      setErrorMsg("Veuillez saisir un âge valide pour l'assuré (entre 18 et 100 ans).");
      return;
    }
    if (Number(age) + duration >= 110) {
      setErrorMsg("L'âge combiné avec la durée dépasse la limite de la table de mortalité.");
      return;
    }
    if (garantieDeces && Number(age) + duration > 70) {
      setErrorMsg("Vous ne pouvez pas souscrire à une garantie de décès.");
      return;
    }

    try {
      const res = simulerPrimeParcelle({
        parcelle: {
          valeurParcelle: parcelle.rawPrice ?? parcelle.price,
          tauxSansRisque: parcelle.tauxSansRisque ?? 0.02,
          volatilite: parcelle.volatilite ?? 0.06,
          fraisMutation: parcelle.fraisMutation ?? 0.20,
          tauxActuariel: parcelle.tauxActuariel ?? 0.035,
          fraisGestion: parcelle.fraisGestion ?? 0.05,
          fraisAcquisition: parcelle.fraisAcquisition ?? 0.03,
        },
        client: {
          dureeAnnees: duration,
          age: Number(age),
          frequencePaiement: Number(frequency) as FrequencePaiement,
          priseEnChargeFraisMutation,
          garantieDeces,
        },
      });

      setSimulationResult(res);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur est survenue lors de la simulation.");
    }
  };

  const getFrequencyLabel = (freq: number, durationYears: number) => {
    if (freq === 12) return "Mensuel";
    if (freq === 4) return "Trimestriel";
    if (freq === 2) return "Semestriel";
    return durationYears <= 1 ? "Unique" : "Annuel";
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary p-3.5 font-sans text-base font-semibold shadow-md transition-all hover:-translate-y-0.5 cursor-pointer"
      >
        <Calculator className="h-5 w-5" />
        Financer ma parcelle
      </button>

      {/* Modal Backdrop — fixed, centered, lock background scroll via Portal */}
      {isOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          onClick={handleClose}
        >
          {/* Panel — capped height with internal vertical scroll */}
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-surface p-6 text-text shadow-2xl animate-[fadeUp_.2s_ease_both]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Icon Button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-text-2 hover:bg-surface-2 hover:text-text transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-primary">
                Simulation de financement
              </h2>
              <p className="mt-1 font-sans text-sm text-text-2">
                Calculez votre échéance selon l'âge, la durée et la fréquence de paiement souhaitées
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSimulate} className="space-y-5">
              {/* Duration Select */}
              <div>
                <label className="block font-sans text-sm font-semibold text-text mb-1.5">
                  Durée de la simulation :
                </label>
                <select
                  value={duration}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setDuration(val);
                  }}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 font-sans text-base text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  required
                >
                  <option value={1}>1 an</option>
                  <option value={2}>2 ans</option>
                  <option value={3}>3 ans</option>
                  <option value={4}>4 ans</option>
                  <option value={5}>5 ans</option>
                  <option value={6}>6 ans</option>
                  <option value={7}>7 ans</option>
                </select>
              </div>

              {/* Age Input */}
              <div>
                <label className="block font-sans text-sm font-semibold text-text mb-1.5">
                  Âge de l'assuré (ans) :
                </label>
                <input
                  type="number"
                  min={18}
                  max={100}
                  value={age}
                  onChange={(e) => {
                    const val = e.target.value === "" ? "" : Number(e.target.value);
                    setAge(val);
                  }}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 font-sans text-base text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  placeholder="Ex: 35"
                />
              </div>

              {/* Mutation Fees Toggle */}
              <div className="flex flex-col gap-2 py-1">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="priseEnChargeFraisMutation"
                    checked={priseEnChargeFraisMutation}
                    onChange={(e) => setPriseEnChargeFraisMutation(e.target.checked)}
                    className="h-4.5 w-4.5 accent-primary rounded cursor-pointer"
                  />
                  <label
                    htmlFor="priseEnChargeFraisMutation"
                    className="font-sans text-sm font-semibold text-text cursor-pointer select-none"
                  >
                    Pris en charge des frais de mutation et TF
                  </label>
                </div>

                <div className="flex items-center gap-2.5 mt-1">
                  <input
                    type="checkbox"
                    id="garantieDeces"
                    checked={garantieDeces}
                    onChange={(e) => setGarantieDeces(e.target.checked)}
                    className="h-4.5 w-4.5 accent-primary rounded cursor-pointer"
                  />
                  <label
                    htmlFor="garantieDeces"
                    className="font-sans text-sm font-semibold text-text cursor-pointer select-none"
                  >
                    Garantie en cas de décès
                  </label>
                </div>
              </div>

              {/* Frequency Select */}
              <div>
                <label className="block font-sans text-sm font-semibold text-text mb-1.5">
                  Fréquence
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(Number(e.target.value) as FrequencePaiement)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 font-sans text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  required
                >
                  <option value="" disabled className="bg-surface text-text-2">
                    Sélectionnez la fréquence de simulation
                  </option>
                  <option value={12} className="bg-surface text-text">Mensuelle (12/an)</option>
                  <option value={4} className="bg-surface text-text">Trimestrielle (4/an)</option>
                  <option value={2} className="bg-surface text-text">Semestrielle (2/an)</option>
                  <option value={1} className="bg-surface text-text">
                    {duration <= 1 ? "Unique (1 paiement)" : "Annuelle (1/an)"}
                  </option>
                </select>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-600 dark:text-red-400">
                  {errorMsg}
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-on-primary py-3 px-5 font-sans text-base font-semibold shadow-md transition-all cursor-pointer"
                >
                  Simuler
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-border bg-transparent hover:bg-surface-2 text-text py-3 px-5 font-sans text-base font-semibold transition-all cursor-pointer"
                >
                  Réinitialiser
                </button>
              </div>
            </form>

            {/* Simulation Result */}
            {simulationResult && (
              <div ref={resultRef} className="mt-6 border-t border-border pt-6 animate-[fadeUp_.3s_ease_both] space-y-4">
                <h3 className="font-display text-lg font-semibold text-primary">
                  Résultat de la simulation
                </h3>

                <div className="rounded-xl bg-surface-2 p-5 border border-border space-y-4">
                  <div className="flex items-center justify-between font-sans">
                    <div>
                      <span className="block text-xs text-text-2 font-medium">Durée</span>
                      <span className="text-base font-bold text-text">
                        {simulationResult.dureeAnnees} an{simulationResult.dureeAnnees > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs text-text-2 font-medium">Fréquence</span>
                      <span className="text-base font-bold text-text">
                        {getFrequencyLabel(simulationResult.frequencePaiement, simulationResult.dureeAnnees)}
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="text-center py-1">
                    <span className="block font-sans text-xs text-text-2 mb-1">
                      Montant par échéance
                    </span>
                    <div className="font-mono text-3xl font-extrabold text-primary tracking-tight">
                      {fmtFCFA(simulationResult.primeParEcheance)} FCFA
                    </div>
                    <p className="mt-2 font-sans text-xs text-text-2">
                      Soit {simulationResult.nombreEcheancesTotal} paiements de{" "}
                      {fmtFCFA(simulationResult.primeParEcheance)} FCFA chacun
                    </p>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="flex items-center justify-between font-sans text-xs font-semibold text-text-2">
                    <span>Coût total estimé</span>
                    <span className="font-mono font-bold text-sm text-text">
                      {fmtFCFA(simulationResult.coutTotalEstime)} FCFA
                    </span>
                  </div>
                </div>

                {/* Debug details collapsible section */}
                {simulationResult.debugDetails && (
                  <details className="mt-4 border border-dashed border-border/80 rounded-xl p-3 bg-surface-2/20">
                    <summary className="cursor-pointer font-sans text-xs font-semibold text-text-2 focus:outline-none select-none">
                      Détails techniques du calcul (Debug)
                    </summary>
                    <div className="mt-3 space-y-2 font-mono text-[11px] text-text-2">
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span>Taux d'actualisation (v)</span>
                        <span className="font-semibold text-text">{simulationResult.debugDetails.v.toFixed(8)}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span>Rente viagère (axn)</span>
                        <span className="font-semibold text-text">{simulationResult.debugDetails.axn.toFixed(8)}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span>Rente certaine (a_t)</span>
                        <span className="font-semibold text-text">{simulationResult.debugDetails.a_t.toFixed(8)}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span>Prime Épargne (brute)</span>
                        <span className="font-semibold text-text">{simulationResult.debugDetails.P_epargne.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span>Prime Mutation (brute)</span>
                        <span className="font-semibold text-text">{simulationResult.debugDetails.P_mutation.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span>d1 (Black-Scholes)</span>
                        <span className="font-semibold text-text">{simulationResult.debugDetails.d1.toFixed(8)}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span>d2 (Black-Scholes)</span>
                        <span className="font-semibold text-text">{simulationResult.debugDetails.d2.toFixed(8)}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span>N(d1)</span>
                        <span className="font-semibold text-text">{simulationResult.debugDetails.N_d1.toFixed(8)}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span>N(d2)</span>
                        <span className="font-semibold text-text">{simulationResult.debugDetails.N_d2.toFixed(8)}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span>Prime Call (Black-Scholes)</span>
                        <span className="font-semibold text-text">{simulationResult.debugDetails.P_call.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span>PUP Décès (cumulé)</span>
                        <span className="font-semibold text-text">{simulationResult.debugDetails.PUP_deces.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span>PUI (Prime Unique Inventaire)</span>
                        <span className="font-semibold text-text">{simulationResult.debugDetails.PUI.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span>PAI (Prime Annuelle Inventaire)</span>
                        <span className="font-semibold text-text">{simulationResult.debugDetails.PAI.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span>PAC (Prime Annuelle Commerciale)</span>
                        <span className="font-semibold text-text">{simulationResult.debugDetails.PAC.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span>Ajustement fréquence (a_m)</span>
                        <span className="font-semibold text-text">{simulationResult.debugDetails.a_m.toFixed(8)}</span>
                      </div>
                    </div>
                  </details>
                )}

                {/* Contacts Info Section */}
                <div className="pt-2 border-t border-border space-y-4">
                  <div className="flex items-start gap-2.5 text-primary dark:text-primary/90">
                    <Phone className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-display text-base font-bold">
                        Contacts pour finaliser votre acquisition
                      </h4>
                      <p className="font-sans text-xs text-text-2 mt-0.5">
                        Contactez nos conseillers pour commencer votre procédure d'acquisition
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Service Commercial / Agence Phone */}
                    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/40 p-4 transition-colors hover:bg-surface-2/60">
                      <Phone className="h-5 w-5 text-primary dark:text-primary/90 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-display text-sm font-bold text-text">
                          {parcelle.pointOfSale?.agency.name ?? "Service Commercial"}
                        </h5>
                        <p className="font-mono text-sm font-semibold text-text mt-1">
                          {parcelle.pointOfSale?.agency.phone ?? "+229 01 23 45 67 89"}
                        </p>
                        <p className="font-sans text-xs text-text-2 mt-0.5">
                          Lun-Ven: 9h-18h
                        </p>
                      </div>
                    </div>

                    {/* Adresse Agence */}
                    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/40 p-4 transition-colors hover:bg-surface-2/60">
                      <MapPin className="h-5 w-5 text-primary dark:text-primary/90 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-display text-sm font-bold text-text">
                          Adresse de l'Agence
                        </h5>
                        <p className="font-sans text-sm font-semibold text-text mt-1">
                          {parcelle.pointOfSale?.agency.address ?? "Non renseignée"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white py-3.5 px-5 font-sans text-sm font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Fermer et contacter un conseiller
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
