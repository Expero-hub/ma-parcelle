"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Calculator, X, Phone, Mail, MapPin } from "lucide-react";
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
  const [mounted, setMounted] = useState(false);

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
              <div className="mt-6 border-t border-border pt-6 animate-[fadeUp_.3s_ease_both] space-y-4">
                <h3 className="font-display text-lg font-semibold text-primary">
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
                    {/* Service Commercial */}
                    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/40 p-4 transition-colors hover:bg-surface-2/60">
                      <Phone className="h-5 w-5 text-primary dark:text-primary/90 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-display text-sm font-bold text-text">
                          Service Commercial
                        </h5>
                        <p className="font-mono text-sm font-semibold text-text mt-1">
                          +229 01 23 45 67 89
                        </p>
                        <p className="font-sans text-xs text-text-2 mt-0.5">
                          Lun-Ven: 9h-18h
                        </p>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/40 p-4 transition-colors hover:bg-surface-2/60">
                      <Mail className="h-5 w-5 text-primary dark:text-primary/90 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-display text-sm font-bold text-text">
                          Email
                        </h5>
                        <p className="font-mono text-sm font-semibold text-text mt-1">
                          financement@parcelles.fr
                        </p>
                        <p className="font-sans text-xs text-text-2 mt-0.5">
                          Réponse sous 24h
                        </p>
                      </div>
                    </div>

                    {/* Agence */}
                    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/40 p-4 transition-colors hover:bg-surface-2/60">
                      <MapPin className="h-5 w-5 text-primary dark:text-primary/90 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-display text-sm font-bold text-text">
                          Agence
                        </h5>
                        <p className="font-sans text-sm font-semibold text-text mt-1">
                          123 Avenue des Parcelles
                        </p>
                        <p className="font-sans text-xs text-text-2 mt-0.5">
                          75001 Paris
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
