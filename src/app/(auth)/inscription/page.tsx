"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/hooks/use-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

interface Company {
  id: string;
  name: string;
}

function InscriptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    birthDate: "",
    companyId: "",
    password: "",
    confirmPassword: "",
  });

  // Charger la liste des compagnies
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await fetch("/api/public/companies");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setCompanies(json.data);
        }
      } catch (err) {
        console.error("Erreur chargement compagnies:", err);
      } finally {
        setLoadingCompanies(false);
      }
    }
    fetchCompanies();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Nettoyer l'erreur du champ modifié
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Validations côté client de base
    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({
        confirmPassword: ["Les mots de passe ne correspondent pas."],
      });
      return;
    }

    if (!formData.companyId) {
      setFieldErrors({
        companyId: ["Veuillez sélectionner votre compagnie d'assurance."],
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          birthDate: formData.birthDate || undefined,
          companyId: formData.companyId,
          password: formData.password,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.error === "VALIDATION_ERROR" && json.details) {
          setFieldErrors(json.details);
        } else {
          setFormError(json.message || "Une erreur est survenue lors de l'inscription.");
        }
      } else {
        // Rediriger vers la page de connexion après inscription réussie
        const target = `/connexion?registered=true${redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}` : ""}`;
        router.push(target);
      }
    } catch (err) {
      console.error("Erreur formulaire inscription:", err);
      setFormError("Impossible de se connecter au serveur.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-text">Inscription</h1>
      <p className="mb-6 text-sm text-text-2">Créez votre compte client Ma Parcelle.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {/* Prénom & Nom */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-text">Prénom</label>
            <Input
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
            {fieldErrors.firstName && <p className="mt-1 text-xs text-alert">{fieldErrors.firstName[0]}</p>}
          </div>
          <div>
            <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-text">Nom</label>
            <Input
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
            {fieldErrors.lastName && <p className="mt-1 text-xs text-alert">{fieldErrors.lastName[0]}</p>}
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-text">Email</label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          {fieldErrors.email && <p className="mt-1 text-xs text-alert">{fieldErrors.email[0]}</p>}
        </div>

        {/* Téléphone */}
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-text">Téléphone (Optionnel)</label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
          />
          {fieldErrors.phone && <p className="mt-1 text-xs text-alert">{fieldErrors.phone[0]}</p>}
        </div>

        {/* Adresse */}
        <div>
          <label htmlFor="address" className="mb-1 block text-sm font-medium text-text">Adresse (Optionnel)</label>
          <Input
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
          />
          {fieldErrors.address && <p className="mt-1 text-xs text-alert">{fieldErrors.address[0]}</p>}
        </div>

        {/* Date de naissance */}
        <div>
          <label htmlFor="birthDate" className="mb-1 block text-sm font-medium text-text">Date de naissance (Optionnelle)</label>
          <Input
            id="birthDate"
            name="birthDate"
            type="date"
            value={formData.birthDate}
            onChange={handleChange}
          />
          {fieldErrors.birthDate && <p className="mt-1 text-xs text-alert">{fieldErrors.birthDate[0]}</p>}
        </div>

        {/* Compagnie Select */}
        <div>
          <label htmlFor="companyId" className="mb-1 block text-sm font-medium text-text">Compagnie d'assurance</label>
          <select
            id="companyId"
            name="companyId"
            value={formData.companyId}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 font-sans text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            required
            disabled={loadingCompanies}
          >
            <option value="">Sélectionnez votre compagnie</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          {fieldErrors.companyId && <p className="mt-1 text-xs text-alert">{fieldErrors.companyId[0]}</p>}
        </div>

        {/* Mot de passe */}
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-text">Mot de passe</label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-2 hover:text-text cursor-pointer focus:outline-none flex items-center justify-center"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.password && <p className="mt-1 text-xs text-alert">{fieldErrors.password[0]}</p>}
        </div>

        {/* Confirmer le mot de passe */}
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-text">Confirmer le mot de passe</label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
          {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-alert">{fieldErrors.confirmPassword[0]}</p>}
        </div>

        {formError && <p className="text-sm text-alert">{formError}</p>}

        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? "Création du compte…" : "S'inscrire"}
        </Button>

        <p className="mt-4 text-center text-xs text-text-2">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="font-semibold text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense fallback={null}>
      <InscriptionForm />
    </Suspense>
  );
}
