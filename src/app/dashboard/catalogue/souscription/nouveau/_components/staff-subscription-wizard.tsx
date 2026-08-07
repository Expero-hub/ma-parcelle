"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/hooks/use-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calculator, User, Award, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { simulerPrimeParcelle } from "@/lib/simulation/simulation";
import { FrequencePaiement, SimulationResult } from "@/lib/simulation/simulation.types";
import { fmtFCFA } from "@/lib/parcelles";

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  companyId?: string | null;
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

interface StaffSubscriptionWizardProps {
  clients: Client[];
  parcelles: ParcelleProps[];
}

type Step = 1 | 2 | 3 | 4;

export function StaffSubscriptionWizard({ clients, parcelles }: StaffSubscriptionWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sélection globale
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedParcelRef, setSelectedParcelRef] = useState<string>("");

  const currentClient = clients.find((c) => c.id === selectedClientId) || null;
  const currentParcel = parcelles.find((p) => p.ref === selectedParcelRef) || null;

  // Étape 1 : Options de Financement
  const [durationYears, setDurationYears] = useState<number>(7);
  const [frequency, setFrequency] = useState<FrequencePaiement>(12);
  const [garantieDeces, setGarantieDeces] = useState<boolean>(true);
  const [verseInit, setVerseInit] = useState<number>(0);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);

  // Étape 2 : Assuré
  const [insuredRelation, setInsuredRelation] = useState<string>("Soi-même");
  const [insuredName, setInsuredName] = useState<string>("");
  const [insuredBirthDate, setInsuredBirthDate] = useState<string>("");
  const [insuredPhone, setInsuredPhone] = useState<string>("");
  const [insuredEmail, setInsuredEmail] = useState<string>("");
  const [insuredAddress, setInsuredAddress] = useState<string>("");

  // Étape 3 : Bénéficiaire
  const [beneficiaryName, setBeneficiaryName] = useState<string>("");
  const [beneficiaryRelation, setBeneficiaryRelation] = useState<string>("");
  const [beneficiaryBirthDate, setBeneficiaryBirthDate] = useState<string>("");
  const [beneficiaryShare, setBeneficiaryShare] = useState<number>(100);
  const [beneficiaryPhone, setBeneficiaryPhone] = useState<string>("");
  const [beneficiaryEmail, setBeneficiaryEmail] = useState<string>("");

  // Étape 4 : Signature
  const [signatureText, setSignatureText] = useState<string>("");

  // Initialiser le versement initial à 20% quand la parcelle est sélectionnée
  useEffect(() => {
    if (currentParcel) {
      setVerseInit(Math.round(currentParcel.price * 0.2));
    }
  }, [currentParcel]);

  // Synchroniser les détails de l'assuré si "Soi-même"
  useEffect(() => {
    if (insuredRelation === "Soi-même" && currentClient) {
      setInsuredName(currentClient.name);
      setInsuredPhone(currentClient.phone || "");
      setInsuredEmail(currentClient.email);
      setInsuredAddress(currentClient.address || "");
    } else if (insuredRelation === "Soi-même") {
      setInsuredName("");
      setInsuredPhone("");
      setInsuredEmail("");
      setInsuredAddress("");
    }
  }, [insuredRelation, currentClient]);

  // Lancer la simulation en direct
  useEffect(() => {
    if (!currentParcel) return;

    let age = 35;
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
          valeurParcelle: currentParcel.price,
          tauxSansRisque: currentParcel.tauxSansRisque,
          volatilite: currentParcel.volatilite,
          fraisMutation: currentParcel.fraisMutation,
          tauxActuariel: currentParcel.tauxActuariel,
          fraisGestion: currentParcel.fraisGestion,
          fraisAcquisition: currentParcel.fraisAcquisition,
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
  }, [durationYears, frequency, garantieDeces, verseInit, insuredBirthDate, currentParcel]);

  const handleNextStep = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (!selectedClientId) {
        setErrorMsg("Veuillez sélectionner un client.");
        return;
      }
      if (!selectedParcelRef) {
        setErrorMsg("Veuillez sélectionner une parcelle.");
        return;
      }
      if (!simulation) {
        setErrorMsg("Veuillez configurer des options financières valides.");
        return;
      }
      if (currentClient && !currentClient.companyId) {
        setErrorMsg("Ce client n'a pas de compagnie d'assurance configurée dans son profil.");
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
      const birth = new Date(insuredBirthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      if (age < 18 || age > 75) {
        setErrorMsg("L'assuré doit être âgé de 18 à 75 ans.");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!beneficiaryName.trim()) {
        setErrorMsg("Le nom complet du bénéficiaire est requis.");
        return;
      }
      if (!beneficiaryRelation.trim()) {
        setErrorMsg("Le lien de relation du bénéficiaire est requis.");
        return;
      }
      if (beneficiaryShare <= 0 || beneficiaryShare > 100) {
        setErrorMsg("La part du bénéficiaire doit être comprise entre 1 et 100%.");
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
      setErrorMsg("Veuillez saisir une signature pour valider le dossier.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/souscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: selectedParcelRef,
          clientId: selectedClientId,
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
          beneficiary: {
            fullName: beneficiaryName,
            relationship: beneficiaryRelation,
            birthDate: beneficiaryBirthDate ? new Date(beneficiaryBirthDate).toISOString() : undefined,
            sharePercentage: Number(beneficiaryShare),
            phone: beneficiaryPhone || undefined,
            email: beneficiaryEmail || undefined,
          },
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMsg(json.message || "Une erreur est survenue lors de la souscription.");
      } else {
        router.push("/dashboard/catalogue/intentions?created=true");
        router.refresh();
      }
    } catch (err) {
      console.error("Erreur staff souscription:", err);
      setErrorMsg("Erreur réseau.");
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

      {/* STEP 1: OPTIONS & CHOICES */}
      {step === 1 && (
        <div className="space-y-6 animate-[fadeUp_.25s_ease_both]">
          <h3 className="font-display text-lg font-bold text-text flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Étape 1 : Paramètres et Options Financières
          </h3>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Sélection Client */}
            <div>
              <label className="block text-sm font-semibold text-text mb-1.5">Sélectionner le client :</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 font-sans text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                required
              >
                <option value="">Sélectionnez un client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Sélection Parcelle */}
            <div>
              <label className="block text-sm font-semibold text-text mb-1.5">Sélectionner la parcelle disponible :</label>
              <select
                value={selectedParcelRef}
                onChange={(e) => setSelectedParcelRef(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 font-sans text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                required
              >
                <option value="">Sélectionnez une parcelle</option>
                {parcelles.map((p) => (
                  <option key={p.id} value={p.ref}>
                    {p.ref} - {p.commune} ({fmtFCFA(p.price)} FCFA)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text mb-1.5">Durée de paiement :</label>
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
              <label className="block text-sm font-semibold text-text mb-1.5">Périodicité :</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value) as FrequencePaiement)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 font-sans text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value={12}>Mensuelle</option>
                <option value={4}>Trimestrielle</option>
                <option value={2}>Semestrielle</option>
                <option value={1}>Annuelle</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text mb-1.5">Versement initial (FCFA) :</label>
              <Input
                type="number"
                min={0}
                value={verseInit}
                onChange={(e) => setVerseInit(e.target.value === "" ? 0 : Number(e.target.value))}
                disabled={!currentParcel}
              />
            </div>

            <div className="flex flex-col justify-end pb-3">
              <label className="flex items-center gap-2.5 font-sans text-sm font-semibold text-text cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={garantieDeces}
                  onChange={(e) => setGarantieDeces(e.target.checked)}
                  className="h-4.5 w-4.5 accent-primary rounded cursor-pointer"
                />
                Garantie Décès incluse
              </label>
            </div>
          </div>

          {/* Simulation Output */}
          {simulation && (
            <div className="rounded-2xl bg-surface-2 border border-border p-5 space-y-4">
              <h4 className="font-display font-bold text-sm text-primary">Simulation de prime</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-text-2 text-xs font-semibold block uppercase">Mensualités</span>
                  <span className="text-base font-bold text-text">{simulation.nombreEcheancesTotal}</span>
                </div>
                <div>
                  <span className="text-text-2 text-xs font-semibold block uppercase">Montant / échéance</span>
                  <span className="text-base font-bold text-primary font-mono">{fmtFCFA(simulation.primeParEcheance)} FCFA</span>
                </div>
                <div>
                  <span className="text-text-2 text-xs font-semibold block uppercase">Total d'acquisition</span>
                  <span className="text-base font-bold text-text font-mono">{fmtFCFA(simulation.coutTotalEstime)} FCFA</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: INSURED */}
      {step === 2 && (
        <div className="space-y-6 animate-[fadeUp_.25s_ease_both]">
          <h3 className="font-display text-lg font-bold text-text flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Étape 2 : L'Assuré
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-1.5">Relation assuré / souscripteur :</label>
              <select
                value={insuredRelation}
                onChange={(e) => setInsuredRelation(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 font-sans text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="Soi-même">Le client lui-même</option>
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
                <label className="block text-sm font-medium text-text mb-1">Date de naissance :</label>
                <Input
                  type="date"
                  value={insuredBirthDate}
                  onChange={(e) => setInsuredBirthDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Téléphone :</label>
                <Input
                  type="tel"
                  value={insuredPhone}
                  onChange={(e) => setInsuredPhone(e.target.value)}
                  disabled={insuredRelation === "Soi-même"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Email :</label>
                <Input
                  type="email"
                  value={insuredEmail}
                  onChange={(e) => setInsuredEmail(e.target.value)}
                  disabled={insuredRelation === "Soi-même"}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text mb-1">Adresse :</label>
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

      {/* STEP 3: BENEFICIARY */}
      {step === 3 && (
        <div className="space-y-6 animate-[fadeUp_.25s_ease_both]">
          <h3 className="font-display text-lg font-bold text-text flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Étape 3 : Le Bénéficiaire
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Nom complet du bénéficiaire :</label>
              <Input
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Relation avec l'assuré :</label>
              <select
                value={beneficiaryRelation}
                onChange={(e) => setBeneficiaryRelation(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 font-sans text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                required
              >
                <option value="">Sélectionnez la relation</option>
                <option value="Conjoint">Conjoint(e)</option>
                <option value="Enfant">Enfant</option>
                <option value="Frère/Sœur">Frère/Sœur</option>
                <option value="Parent">Parent</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Date de naissance (Optionnel) :</label>
              <Input
                type="date"
                value={beneficiaryBirthDate}
                onChange={(e) => setBeneficiaryBirthDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Part (%) :</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={beneficiaryShare}
                onChange={(e) => setBeneficiaryShare(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Téléphone (Optionnel) :</label>
              <Input
                type="tel"
                value={beneficiaryPhone}
                onChange={(e) => setBeneficiaryPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Email (Optionnel) :</label>
              <Input
                type="email"
                value={beneficiaryEmail}
                onChange={(e) => setBeneficiaryEmail(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: CONFIRMATION */}
      {step === 4 && (
        <form onSubmit={handleSubmit} className="space-y-6 animate-[fadeUp_.25s_ease_both]">
          <h3 className="font-display text-lg font-bold text-text flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Étape 4 : Validation finale
          </h3>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Plan */}
            <div className="rounded-2xl border border-border bg-surface-2 p-5 space-y-3 text-sm">
              <h4 className="font-display font-bold text-primary border-b border-border pb-2">Plan financier</h4>
              <div className="flex justify-between">
                <span className="text-text-2">Parcelle</span>
                <span className="font-semibold text-text">{selectedParcelRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-2">Durée</span>
                <span className="font-semibold text-text">{durationYears} ans</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-2">Mensualité</span>
                <span className="font-bold text-primary font-mono">
                  {simulation ? fmtFCFA(simulation.primeParEcheance) : "—"} FCFA
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-2">Apport Initial</span>
                <span className="font-bold text-text font-mono">{fmtFCFA(verseInit)} FCFA</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-text-2 font-bold">Total estimé</span>
                <span className="font-bold text-text font-mono">
                  {simulation ? fmtFCFA(simulation.coutTotalEstime) : "—"} FCFA
                </span>
              </div>
            </div>

            {/* Clients */}
            <div className="rounded-2xl border border-border bg-surface-2 p-5 space-y-3 text-sm">
              <h4 className="font-display font-bold text-primary border-b border-border pb-2">Résumé des parties</h4>
              <div>
                <span className="text-text-2 text-xs font-semibold block uppercase">Client souscripteur</span>
                <span className="font-semibold text-text">{currentClient?.name}</span>
              </div>
              <div>
                <span className="text-text-2 text-xs font-semibold block uppercase">Assuré</span>
                <span className="font-semibold text-text">
                  {insuredName} ({insuredRelation})
                </span>
              </div>
              <div>
                <span className="text-text-2 text-xs font-semibold block uppercase">Bénéficiaire</span>
                <span className="font-semibold text-text">
                  {beneficiaryName} ({beneficiaryRelation} - {beneficiaryShare}%)
                </span>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="rounded-2xl border border-border bg-surface-2/40 p-5 space-y-3">
            <label className="block text-sm font-semibold text-text">
              Signature du conseiller / staff :
            </label>
            <p className="text-xs text-text-2">
              Saisissez la mention &quot;SOUSCRIT PAR COMPTE DU CLIENT&quot; suivie de votre nom complet.
            </p>
            <Input
              value={signatureText}
              onChange={(e) => setSignatureText(e.target.value)}
              placeholder="Ex: SOUSCRIT PAR COMPTE DU CLIENT, CONSEILLER DUPONT"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            {errorMsg && <p className="text-sm text-alert mr-auto self-center">{errorMsg}</p>}
          </div>
        </form>
      )}

      {/* Navigation Buttons */}
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
            {submitting ? "Création du contrat..." : "Confirmer la souscription"}
          </Button>
        )}
      </div>
    </div>
  );
}
