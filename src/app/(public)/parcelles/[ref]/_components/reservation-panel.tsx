"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useSession } from "@/lib/auth-client";
import {
  STATUT_META,
  fmtFCFA,
  pricePerM2,
  type Parcelle,
} from "@/lib/parcelles";

import { FinancementModal } from "./financement-modal";
import { MapPin, Phone } from "lucide-react";

interface ReservationPanelProps {
  p: Parcelle;
}

type Step = "idle" | "form" | "done";

export function ReservationPanel({ p }: ReservationPanelProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [step, setStep] = useState<Step>("idle");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const avail = STATUT_META[p.statut]?.avail ?? p.statut === "disponible";

  const handleReservation = async () => {
    setErrorMessage(null);

    if (!session) {
      setErrorMessage(
        "Vous devez être connecté avec un compte client disposant d'un contrat actif pour réserver cette parcelle.",
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/public/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: p.ref }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(
          data.message ||
          "Impossible de faire la réservation. Seuls les clients disposant d'un contrat en cours peuvent réserver.",
        );
      } else {
        setSuccessMessage(data.message);
        setStep("done");
      }
    } catch (err) {
      console.error("Erreur réservation:", err);
      setErrorMessage("Une erreur est survenue lors de la réservation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg:sticky lg:top-[92px]">
      <div className="flex flex-col gap-4 rounded-[18px] border border-border bg-surface p-[22px] shadow-[var(--shadow)]">
        <div>
          <div className="mb-[5px] font-sans text-xs text-text-2">
            Financement à partir de
          </div>
          <div className="font-mono text-3xl leading-none font-semibold text-text">
            {fmtFCFA(p.monthlyPayment7Years ?? 0)} F/mois
          </div>
          <div className="mt-[6px] font-sans text-[12.5px] text-text-2">
            sur 7 ans · {p.surf} m²
          </div>
        </div>

        <div className="h-px bg-border" />

        {errorMessage && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 font-sans text-xs font-medium text-red-600 dark:text-red-400">
            {errorMessage}
            {!session && (
              <div className="mt-2">
                <Link
                  href={`/connexion?redirect=${encodeURIComponent(pathname)}`}
                  className="font-bold underline text-primary"
                >
                  Se connecter
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Bouton simulation de financement */}
        <FinancementModal parcelle={p} />

        {/* CTA / flux de réservation */}
        {!avail ? (
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-xl border border-border bg-surface-2 p-4 font-sans text-[15px] font-semibold text-text-2"
          >
            {p.statut === "reserve"
              ? "Rejoindre la liste d'attente"
              : "Parcelle vendue"}
          </button>
        ) : step === "idle" ? (
          <button
            type="button"
            onClick={handleReservation}
            disabled={loading}
            className="w-full cursor-pointer rounded-xl bg-primary p-4 font-sans text-base font-semibold text-on-primary shadow-[var(--shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)] disabled:opacity-50"
          >
            {loading ? "Vérification du contrat..." : "Réserver cette parcelle"}
          </button>
        ) : (
          <div className="flex animate-[fadeUp_.35s_ease_both] flex-col items-center gap-[10px] border-t border-border pt-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-[26px] leading-none text-white">
              ✓
            </span>
            <div className="font-display text-[17px] leading-[1.2] font-semibold">
              Réservation enregistrée
            </div>
            <p className="m-0 font-sans text-[13.5px] leading-[1.5] text-text-2">
              {successMessage ||
                `La parcelle ${p.ref} est bloquée à votre nom. Un conseiller vous contactera sous peu.`}
            </p>
            <Link
              href="/parcelles"
              className="mt-1 rounded-[10px] border border-border bg-transparent px-4 py-[11px] font-sans text-[13px] font-semibold text-text"
            >
              Voir d’autres parcelles
            </Link>
          </div>
        )}

        {/* Service Commercial / Agence Phone */}
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/40 p-4 transition-colors hover:bg-surface-2/60">
          <Phone className="h-5 w-5 text-primary dark:text-primary/90 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-display text-sm font-bold text-text">
              {p.pointOfSale?.agency.name ?? "Service Commercial"}
            </h5>
            <p className="font-mono text-sm font-semibold text-text mt-1">
              {p.pointOfSale?.agency.phone ?? "+229 01 23 45 67 89"}
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
              {p.pointOfSale?.agency.address ?? "Non renseignée"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

