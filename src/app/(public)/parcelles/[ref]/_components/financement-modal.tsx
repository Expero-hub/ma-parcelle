"use client";

import { useState } from "react";
import { Calculator, X } from "lucide-react";
import { fmtFCFA, type Parcelle } from "@/lib/parcelles";

interface FinancementModalProps {
  parcelle: Parcelle;
}

type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "semi_annual" | "annual";

const FREQUENCIES: { value: Frequency; label: string; perYear: number; resultLabel: string }[] = [
  { value: "daily", label: "Quotidienne (365/an)", perYear: 365, resultLabel: "Quotidien" },
  { value: "weekly", label: "Hebdomadaire (52/an)", perYear: 52, resultLabel: "Hebdomadaire" },
  { value: "monthly", label: "Mensuelle (12/an)", perYear: 12, resultLabel: "Mensuel" },
  { value: "quarterly", label: "Trimestrielle (4/an)", perYear: 4, resultLabel: "Trimestriel" },
  { value: "semi_annual", label: "Semestrielle (2/an)", perYear: 2, resultLabel: "Semestriel" },
  { value: "annual", label: "Annuelle (1/an)", perYear: 1, resultLabel: "Annuel" },
];

export function FinancementModal({ parcelle }: FinancementModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const minDur = parcelle.minDuration ?? 1;
  const maxDur = parcelle.maxDuration ?? 5;

  const [duration, setDuration] = useState<number>(minDur);
  const [frequency, setFrequency] = useState<Frequency | "">("");
  const [simulationResult, setSimulationResult] = useState<{
    durationYears: number;
    frequencyLabel: string;
    amountPerPayment: number;
    totalPayments: number;
  } | null>(null);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleReset = () => {
    setDuration(minDur);
    setFrequency("");
    setSimulationResult(null);
  };

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frequency) return;

    const freqObj = FREQUENCIES.find((f) => f.value === frequency);
    if (!freqObj) return;

    const totalPayments = duration * freqObj.perYear;
    const amountPerPayment = Math.round(parcelle.price / totalPayments);

    setSimulationResult({
      durationYears: duration,
      frequencyLabel: freqObj.resultLabel,
      amountPerPayment,
      totalPayments,
    });
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

      {/* Modal Backdrop — fixed, centré, ne bouge jamais même si le contenu grandit */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-xs animate-[fadeUp_.2s_ease_both]"
          onClick={handleClose}
        >
          {/* Panel — hauteur plafonnée, scroll vertical interne si le contenu dépasse */}
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-surface p-6 text-text shadow-2xl"
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
                Calculez votre mensualité selon la durée et la fréquence de paiement souhaitées
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSimulate} className="space-y-5">
              {/* Duration Input */}
              <div>
                <label className="block font-sans text-sm font-semibold text-text mb-1.5">
                  Durée de la simulation (an) :
                </label>
                <input
                  type="number"
                  min={minDur}
                  max={maxDur}
                  value={duration}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setDuration(val);
                  }}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 font-sans text-base text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <p className="mt-1.5 font-sans text-xs text-text-2 font-medium">
                  * La durée est comprise entre {minDur} et {maxDur} ans
                </p>
              </div>

              {/* Frequency Select */}
              <div>
                <label className="block font-sans text-sm font-semibold text-text mb-1.5">
                  Fréquence
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 font-sans text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  required
                >
                  <option value="" disabled className="bg-surface text-text-2">
                    Sélectionnez la fréquence de simulation
                  </option>
                  {FREQUENCIES.map((freq) => (
                    <option key={freq.value} value={freq.value} className="bg-surface text-text">
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>

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
              <div className="mt-6 border-t border-border pt-6 animate-[fadeUp_.3s_ease_both]">
                <h3 className="font-display text-lg font-semibold text-primary mb-4">
                  Résultat de la simulation
                </h3>

                <div className="rounded-xl bg-surface-2 p-5 border border-border space-y-4">
                  <div className="flex items-center justify-between font-sans">
                    <div>
                      <span className="block text-xs text-text-2 font-medium">Durée</span>
                      <span className="text-base font-bold text-text">
                        {simulationResult.durationYears} ans
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs text-text-2 font-medium">Fréquence</span>
                      <span className="text-base font-bold text-text">
                        {simulationResult.frequencyLabel}
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="text-center py-1">
                    <span className="block font-sans text-xs text-text-2 mb-1">
                      Montant par paiement
                    </span>
                    <div className="font-mono text-3xl font-extrabold text-primary tracking-tight">
                      {fmtFCFA(simulationResult.amountPerPayment)} FCFA
                    </div>
                    <p className="mt-2 font-sans text-xs text-text-2">
                      Soit {simulationResult.totalPayments} paiements de{" "}
                      {fmtFCFA(simulationResult.amountPerPayment)} FCFA chacun
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
