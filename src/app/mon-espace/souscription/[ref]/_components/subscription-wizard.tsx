"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/hooks/use-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calculator, User, Award, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { simulerPrimeParcelle } from "@/lib/simulation/simulation";
import { FrequencePaiement, SimulationResult } from "@/lib/simulation/simulation.types";
import { fmtFCFA } from "@/lib/parcelles";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  birthDate?: string | Date | null;
}

interface ParcelleProps {
  id: string;
  ref: string;
  rawPrice: number;
  price: number;
  commune: string;
  tauxSansRisque: number;
  volatilite: number;
  fraisMutation: number;
  tauxActuariel: number;
  fraisGestion: number;
  fraisAcquisition: number;
}

interface SubscriptionWizardProps {
  user: UserProfile;
  parcelle: ParcelleProps;
}

type Step = 1 | 2 | 3 | 4;

export function SubscriptionWizard({ user, parcelle }: SubscriptionWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Étape 1 : Options de Financement
  const [durationYears, setDurationYears] = useState<number>(7);
  const [frequency, setFrequency] = useState<FrequencePaiement>(12);
  const [garantieDeces, setGarantieDeces] = useState<boolean>(true);
  const [verseInit, setVerseInit] = useState<number>(0);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);

  // Étape 2 : Assuré
  const [insuredRelation, setInsuredRelation] = useState<string>("Soi-même");
  const [insuredName, setInsuredName] = useState<string>(user.name);
  const [insuredBirthDate, setInsuredBirthDate] = useState<string>(() => {
    if (user?.birthDate) {
      try {
        return new Date(user.birthDate).toISOString().split("T")[0];
      } catch (e) {
        return "";
      }
    }
    return "";
  });
  const [insuredPhone, setInsuredPhone] = useState<string>(user.phone || "");
  const [insuredEmail, setInsuredEmail] = useState<string>(user.email);
  const [insuredAddress, setInsuredAddress] = useState<string>(user.address || "");

  // Étape 3 : Bénéficiaire au Terme (Cas 1)
  const [termRelation, setTermRelation] = useState<string>("");
  const [termName, setTermName] = useState<string>("");
  const [termBirthDate, setTermBirthDate] = useState<string>("");
  const [termPhone, setTermPhone] = useState<string>("");
  const [termEmail, setTermEmail] = useState<string>("");

  // Étape 3 : Bénéficiaire en cas de Décès (Cas 2)
  const [deathRelation, setDeathRelation] = useState<string>("");
  const [deathName, setDeathName] = useState<string>("");
  const [deathBirthDate, setDeathBirthDate] = useState<string>("");
  const [deathPhone, setDeathPhone] = useState<string>("");
  const [deathEmail, setDeathEmail] = useState<string>("");

  // Étape 4 : Signature
  const [signatureText, setSignatureText] = useState<string>("");

  // Gérer le changement de relation pour l'Assuré
  useEffect(() => {
    if (insuredRelation === "Soi-même") {
      setInsuredName(user.name);
      setInsuredPhone(user.phone || "");
      setInsuredEmail(user.email);
      setInsuredAddress(user.address || "");
      if (user?.birthDate) {
        try {
          setInsuredBirthDate(new Date(user.birthDate).toISOString().split("T")[0]);
        } catch {
          setInsuredBirthDate("");
        }
      } else {
        setInsuredBirthDate("");
      }
    } else {
      setInsuredName("");
      setInsuredPhone("");
      setInsuredEmail("");
      setInsuredAddress("");
      setInsuredBirthDate("");
    }
  }, [insuredRelation, user]);

  // Gérer le préremplissage du Bénéficiaire au terme (Cas 1)
  useEffect(() => {
    if (termRelation === "L'assuré lui-même") {
      setTermName(insuredName);
      setTermBirthDate(insuredBirthDate);
      setTermPhone(insuredPhone);
      setTermEmail(insuredEmail);
    } else {
      setTermName("");
      setTermBirthDate("");
      setTermPhone("");
      setTermEmail("");
    }
  }, [termRelation, insuredName, insuredBirthDate, insuredPhone, insuredEmail]);

  // Gérer le préremplissage du Bénéficiaire en cas de décès (Cas 2)
  useEffect(() => {
    if (deathRelation === "Le souscripteur") {
      setDeathName(user.name);
      setDeathPhone(user.phone || "");
      setDeathEmail(user.email);
      if (user?.birthDate) {
        try {
          setDeathBirthDate(new Date(user.birthDate).toISOString().split("T")[0]);
        } catch {
          setDeathBirthDate("");
        }
      } else {
        setDeathBirthDate("");
      }
    } else {
      setDeathName("");
      setDeathBirthDate("");
      setDeathPhone("");
      setDeathEmail("");
    }
  }, [deathRelation, user]);

  // Recalculer la simulation à chaque modification des options financières ou de l'âge
  useEffect(() => {
    // Calcul de l'âge de l'assuré
    let age = 35; // Par défaut
    if (insuredBirthDate) {
      const birth = new Date(insuredBirthDate);
      const today = new Date();
      age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
    }

    try {
      const res = simulerPrimeParcelle({
        parcelle: {
          valeurParcelle: parcelle.price,
          tauxSansRisque: parcelle.tauxSansRisque,
          volatilite: parcelle.volatilite,
          fraisMutation: parcelle.fraisMutation,
          tauxActuariel: parcelle.tauxActuariel,
          fraisGestion: parcelle.fraisGestion,
          fraisAcquisition: parcelle.fraisAcquisition,
        },
        client: {
          dureeAnnees: durationYears,
          age: age > 0 ? age : 35,
          frequencePaiement: frequency,
          priseEnChargeFraisMutation: false,
          garantieDeces,
          verse_init: verseInit,
        },
      });
      setSimulation(res);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de la simulation.");
      setSimulation(null);
    }
  }, [durationYears, frequency, garantieDeces, verseInit, insuredBirthDate, parcelle]);

  const handleNextStep = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (!simulation) {
        setErrorMsg("Veuillez configurer des options financières valides.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!insuredName.trim()) {
        setErrorMsg("Le nom complet de l'assuré est requis.");
        return;
      }
      if (!insuredBirthDate) {
        setErrorMsg("La date de naissance de l'assuré est requise.");
        return;
      }
      // Valider l'âge de l'assuré
      const birth = new Date(insuredBirthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      if (age < 18 || age > 75) {
        setErrorMsg("L'assuré doit être âgé de 18 à 75 ans.");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!termName.trim()) {
        setErrorMsg("Le nom du bénéficiaire au terme est requis.");
        return;
      }
      if (!termRelation.trim()) {
        setErrorMsg("La relation avec le bénéficiaire au terme est requise.");
        return;
      }
      if (!deathName.trim()) {
        setErrorMsg("Le nom du bénéficiaire en cas de décès est requis.");
        return;
      }
      if (!deathRelation.trim()) {
        setErrorMsg("La relation avec le bénéficiaire en cas de décès est requise.");
        return;
      }
      setStep(4);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!signatureText.trim()) {
      setErrorMsg("Veuillez saisir votre signature électronique pour valider la souscription.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/souscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: parcelle.ref,
          options: {
            durationYears,
            frequency,
            garantieDeces,
            verseInit,
            signature: signatureText,
          },
          insured: {
            fullName: insuredName,
            birthDate: new Date(insuredBirthDate).toISOString(),
            phone: insuredPhone || undefined,
            email: insuredEmail || undefined,
            address: insuredAddress || undefined,
            relationship: insuredRelation,
          },
          beneficiaryTerm: {
            fullName: termName,
            relationship: termRelation,
            birthDate: termBirthDate ? new Date(termBirthDate).toISOString() : undefined,
            sharePercentage: 100,
            phone: termPhone || undefined,
            email: termEmail || undefined,
          },
          beneficiaryDeath: {
            fullName: deathName,
            relationship: deathRelation,
            birthDate: deathBirthDate ? new Date(deathBirthDate).toISOString() : undefined,
            sharePercentage: 100,
            phone: deathPhone || undefined,
            email: deathEmail || undefined,
          },
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMsg(json.message || "Une erreur est survenue lors de la souscription.");
      } else {
        router.push("/mon-espace/intentions?subscribed=true");
        router.refresh();
      }
    } catch (err) {
      console.error("Erreur validation souscription:", err);
      setErrorMsg("Une erreur réseau s'est produite.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-[var(--shadow)] space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        {[
          { label: "Financement", num: 1, icon: Calculator },
          { label: "Assuré", num: 2, icon: User },
          { label: "Bénéficiaire", num: 3, icon: Award },
          { label: "Validation", num: 4, icon: CheckCircle },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = step === s.num;
          const isCompleted = step > s.num;
          return (
            <div key={s.num} className="flex flex-col items-center gap-1.5 flex-1 text-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-all ${
                  isActive
                    ? "border-primary bg-primary text-on-primary shadow-sm scale-105"
                    : isCompleted
                      ? "border-secondary bg-secondary text-white"
                      : "border-border bg-surface-2 text-text-2"
                }`}
              >
                {isCompleted ? "✓" : s.num}
              </div>
              <span
                className={`hidden md:block text-xs font-semibold ${
                  isActive ? "text-primary" : isCompleted ? "text-secondary" : "text-text-2"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-600 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      {/* STEP 1: FINANCIAL OPTIONS */}
      {step === 1 && (
        <div className="space-y-6 animate-[fadeUp_.25s_ease_both]">
          <h3 className="font-display text-lg font-bold text-text flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Étape 1 : Options de Financement
          </h3>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-text mb-1.5">Durée du contrat :</label>
              <select
                value={durationYears}
                onChange={(e) => setDurationYears(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 font-sans text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr} an{yr > 1 ? "s" : ""} ({yr * 12} mois)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text mb-1.5">Fréquence de paiement :</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value) as FrequencePaiement)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 font-sans text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value={12}>Mensuelle (12/an)</option>
                <option value={4}>Trimestrielle (4/an)</option>
                <option value={2}>Semestrielle (2/an)</option>
                <option value={1}>Annuelle (1/an)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end pb-3">
              <label className="flex items-center gap-2.5 font-sans text-sm font-semibold text-text cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={garantieDeces}
                  onChange={(e) => setGarantieDeces(e.target.checked)}
                  className="h-4.5 w-4.5 accent-primary rounded cursor-pointer"
                />
                Inclure la Garantie Décès de l'assuré
              </label>
            </div>
          </div>

          {/* Real-time Simulation Output Box */}
          {simulation && (
            <div className="rounded-2xl bg-surface-2 border border-border p-5 space-y-4">
              <h4 className="font-display font-bold text-sm text-primary">Estimation des échéances</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-text-2 text-xs font-semibold block uppercase">Nombre d'échéances</span>
                  <span className="text-base font-bold text-text">{simulation.nombreEcheancesTotal}</span>
                </div>
                <div>
                  <span className="text-text-2 text-xs font-semibold block uppercase">Montant par échéance</span>
                  <span className="text-base font-bold text-primary font-mono">{fmtFCFA(simulation.primeParEcheance)} FCFA</span>
                </div>
                <div>
                  <span className="text-text-2 text-xs font-semibold block uppercase">Coût total estimé</span>
                  <span className="text-base font-bold text-text font-mono">{fmtFCFA(simulation.coutTotalEstime)} FCFA</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: INSURED INFORMATION */}
      {step === 2 && (
        <div className="space-y-6 animate-[fadeUp_.25s_ease_both]">
          <h3 className="font-display text-lg font-bold text-text flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Étape 2 : Profil de l'Assuré
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-1.5">Lien entre l'assuré et le souscripteur :</label>
              <select
                value={insuredRelation}
                onChange={(e) => setInsuredRelation(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 font-sans text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="Soi-même">Soi-même (Je suis le souscripteur et l'assuré)</option>
                <option value="Conjoint">Conjoint(e)</option>
                <option value="Enfant">Enfant</option>
                <option value="Parent">Parent</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Nom complet de l'assuré :</label>
                <Input
                  value={insuredName}
                  onChange={(e) => setInsuredName(e.target.value)}
                  disabled={insuredRelation === "Soi-même"}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Date de naissance de l'assuré :</label>
                <Input
                  type="date"
                  value={insuredBirthDate}
                  onChange={(e) => setInsuredBirthDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Téléphone de l'assuré :</label>
                <Input
                  type="tel"
                  value={insuredPhone}
                  onChange={(e) => setInsuredPhone(e.target.value)}
                  disabled={insuredRelation === "Soi-même"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Email de l'assuré :</label>
                <Input
                  type="email"
                  value={insuredEmail}
                  onChange={(e) => setInsuredEmail(e.target.value)}
                  disabled={insuredRelation === "Soi-même"}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text mb-1">Adresse de l'assuré :</label>
                <Input
                  value={insuredAddress}
                  onChange={(e) => setInsuredAddress(e.target.value)}
                  disabled={insuredRelation === "Soi-même"}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: BENEFICIARY INFORMATION */}
      {step === 3 && (
        <div className="space-y-8 animate-[fadeUp_.25s_ease_both]">
          <h3 className="font-display text-lg font-bold text-text flex items-center gap-2 border-b border-border pb-3">
            <Award className="h-5 w-5 text-primary" />
            Étape 3 : Bénéficiaires du Contrat
          </h3>

          {/* CAS 1 : Bénéficiaire au terme du contrat */}
          <div className="space-y-4">
            <h4 className="font-display text-base font-bold text-primary">
              Cas 1 : Bénéficiaire au terme du contrat (Financement réussi)
            </h4>
            <p className="text-xs text-text-2">
              Désignez la personne qui recevra la propriété de la parcelle à la fin du contrat.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Relation avec l'assuré :</label>
                <select
                  value={termRelation}
                  onChange={(e) => setTermRelation(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 font-sans text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  required
                >
                  <option value="">Sélectionnez la relation</option>
                  <option value="L'assuré lui-même">L'assuré lui-même</option>
                  <option value="Conjoint">Conjoint(e)</option>
                  <option value="Enfant">Enfant</option>
                  <option value="Frère/Sœur">Frère/Sœur</option>
                  <option value="Parent">Parent</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Nom complet du bénéficiaire :</label>
                <Input
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  required
                  placeholder="Ex: Jean Dupont"
                  disabled={termRelation === "L'assuré lui-même"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Date de naissance (Optionnel) :</label>
                <Input
                  type="date"
                  value={termBirthDate}
                  onChange={(e) => setTermBirthDate(e.target.value)}
                  disabled={termRelation === "L'assuré lui-même"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Téléphone (Optionnel) :</label>
                <Input
                  type="tel"
                  value={termPhone}
                  onChange={(e) => setTermPhone(e.target.value)}
                  disabled={termRelation === "L'assuré lui-même"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Email (Optionnel) :</label>
                <Input
                  type="email"
                  value={termEmail}
                  onChange={(e) => setTermEmail(e.target.value)}
                  disabled={termRelation === "L'assuré lui-même"}
                />
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* CAS 2 : Bénéficiaire en cas de décès avant terme */}
          <div className="space-y-4">
            <h4 className="font-display text-base font-bold text-primary">
              Cas 2 : Bénéficiaire en cas de décès avant le terme du contrat
            </h4>
            <p className="text-xs text-text-2">
              Désignez la personne qui bénéficiera de la garantie décès et du transfert du contrat.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Relation avec l'assuré :</label>
                <select
                  value={deathRelation}
                  onChange={(e) => setDeathRelation(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 font-sans text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  required
                >
                  <option value="">Sélectionnez la relation</option>
                  <option value="Le souscripteur">Le souscripteur</option>
                  <option value="Conjoint">Conjoint(e)</option>
                  <option value="Enfant">Enfant</option>
                  <option value="Frère/Sœur">Frère/Sœur</option>
                  <option value="Parent">Parent</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Nom complet du bénéficiaire :</label>
                <Input
                  value={deathName}
                  onChange={(e) => setDeathName(e.target.value)}
                  required
                  placeholder="Ex: Marie Dupont"
                  disabled={deathRelation === "Le souscripteur"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Date de naissance (Optionnel) :</label>
                <Input
                  type="date"
                  value={deathBirthDate}
                  onChange={(e) => setDeathBirthDate(e.target.value)}
                  disabled={deathRelation === "Le souscripteur"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Téléphone (Optionnel) :</label>
                <Input
                  type="tel"
                  value={deathPhone}
                  onChange={(e) => setDeathPhone(e.target.value)}
                  disabled={deathRelation === "Le souscripteur"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Email (Optionnel) :</label>
                <Input
                  type="email"
                  value={deathEmail}
                  onChange={(e) => setDeathEmail(e.target.value)}
                  disabled={deathRelation === "Le souscripteur"}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: RECAPITULATIF & VALIDATION */}
      {step === 4 && (
        <form onSubmit={handleSubmit} className="space-y-6 animate-[fadeUp_.25s_ease_both]">
          <h3 className="font-display text-lg font-bold text-text flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Étape 4 : Récapitulatif & Signature
          </h3>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Recap Financement */}
            <div className="rounded-2xl border border-border bg-surface-2 p-5 space-y-3 text-sm">
              <h4 className="font-display font-bold text-primary border-b border-border pb-2">Plan financier</h4>
              <div className="flex justify-between">
                <span className="text-text-2">Parcelle</span>
                <span className="font-semibold text-text">{parcelle.ref}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-2">Durée</span>
                <span className="font-semibold text-text">{durationYears} ans ({durationYears * 12} mois)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-2">Échéance</span>
                <span className="font-bold text-primary font-mono">
                  {simulation ? fmtFCFA(simulation.primeParEcheance) : "—"} FCFA
                </span>
              </div>

              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-text-2 font-bold">Total d'acquisition estimé</span>
                <span className="font-bold text-text font-mono">
                  {simulation ? fmtFCFA(simulation.coutTotalEstime) : "—"} FCFA
                </span>
              </div>
            </div>

            {/* Recap Parties Prenantes */}
            <div className="rounded-2xl border border-border bg-surface-2 p-5 space-y-3 text-sm">
              <h4 className="font-display font-bold text-primary border-b border-border pb-2">Parties contractantes</h4>
              <div>
                <span className="text-text-2 text-xs font-semibold block uppercase">Souscripteur (Payeur)</span>
                <span className="font-semibold text-text">{user.name}</span>
              </div>
              <div>
                <span className="text-text-2 text-xs font-semibold block uppercase">Assuré</span>
                <span className="font-semibold text-text">
                  {insuredName} ({insuredRelation})
                </span>
              </div>
              <div>
                <span className="text-text-2 text-xs font-semibold block uppercase">Bénéficiaire au terme</span>
                <span className="font-semibold text-text">
                  {termName} ({termRelation})
                </span>
              </div>
              <div>
                <span className="text-text-2 text-xs font-semibold block uppercase">Bénéficiaire en cas de décès</span>
                <span className="font-semibold text-text">
                  {deathName} ({deathRelation})
                </span>
              </div>
            </div>
          </div>

          {/* Signature Area */}
          <div className="rounded-2xl border border-border bg-surface-2/40 p-5 space-y-3">
            <label className="block text-sm font-semibold text-text">
              Signature électronique :
            </label>
            <p className="text-xs text-text-2">
              Veuillez saisir votre nom complet en lettres majuscules précédé de la mention &quot;LU ET APPROUVÉ&quot; pour valider légalement votre dossier de souscription.
            </p>
            <Input
              value={signatureText}
              onChange={(e) => setSignatureText(e.target.value)}
              placeholder="Ex: LU ET APPROUVÉ, JEAN DUPONT"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            {errorMsg && <p className="text-sm text-alert mr-auto self-center">{errorMsg}</p>}
          </div>
        </form>
      )}

      {/* Button Controls */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        {step > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevStep}
            className="flex items-center gap-2"
            disabled={submitting}
          >
            <ArrowLeft className="h-4 w-4" />
            Précédent
          </Button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <Button
            type="button"
            onClick={handleNextStep}
            className="flex items-center gap-2"
          >
            Suivant
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2"
          >
            {submitting ? "Traitement en cours…" : "Soumettre la souscription"}
          </Button>
        )}
      </div>
    </div>
  );
}
