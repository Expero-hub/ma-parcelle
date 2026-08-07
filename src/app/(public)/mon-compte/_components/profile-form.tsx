"use client";

import { useState } from "react";
import { User, Mail, Phone, Lock, Eye, EyeOff, MapPin, Save, ShieldAlert } from "lucide-react";

type FormUser = {
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  birthDate: string;
  role: string;
};

export function ProfileForm({ user }: { user: FormUser }) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [address, setAddress] = useState(user.address);
  const [birthDate, setBirthDate] = useState(user.birthDate);

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (newPassword && newPassword !== confirmPassword) {
        throw new Error("Les mots de passe ne correspondent pas.");
      }

      const res = await fetch("/api/public/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone: phone || null,
          address: address || null,
          birthDate: birthDate || null,
          newPassword: newPassword || null,
          confirmPassword: confirmPassword || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Une erreur est survenue lors de la mise à jour.");
      }

      setSuccess("Vos modifications ont été enregistrées avec succès.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Page Title Header */}
      <div className="flex items-start gap-4 border-b border-border pb-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <User className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Informations personnelles</h1>
          <p className="text-sm text-text-2 mt-1">
            Modifiez vos informations de profil et vos préférences de compte
          </p>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Personal Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-wide uppercase">
          <User className="h-4 w-4" />
          <span>Informations personnelles</span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-text-2 uppercase mb-2" htmlFor="lastName">
              Nom
            </label>
            <div className="relative">
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary font-sans text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-2 uppercase mb-2" htmlFor="firstName">
              Prénom
            </label>
            <div className="relative">
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary font-sans text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-2 uppercase mb-2" htmlFor="birthDate">
              Date de naissance
            </label>
            <div className="relative">
              <input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary font-sans text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Contact Info */}
      <div className="space-y-4 pt-4 border-t border-border/60">
        <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-wide uppercase">
          <Mail className="h-4 w-4" />
          <span>Informations de contact</span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-text-2 uppercase mb-2" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-2">
                <Mail className="h-4 w-4" />
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary font-sans text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-2 uppercase mb-2" htmlFor="phone">
              Contact
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-2">
                <Phone className="h-4 w-4" />
              </span>
              <input
                id="phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0123456789"
                className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary font-sans text-sm"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-2 uppercase mb-2" htmlFor="address">
            Adresse
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-2">
              <MapPin className="h-4 w-4" />
            </span>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 rue..."
              className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary font-sans text-sm"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Security */}
      <div className="space-y-4 pt-4 border-t border-border/60">
        <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-wide uppercase">
          <Lock className="h-4 w-4" />
          <span>Sécurité</span>
        </div>

        {/* Warning Banner */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <h4 className="font-bold text-sm mb-1">Modification du mot de passe</h4>
          <p className="font-normal">
            Laissez ces champs vides si vous ne souhaitez pas changer votre mot de passe
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-text-2 uppercase mb-2" htmlFor="newPassword">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-2">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface pl-10 pr-10 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary font-sans text-sm"
                placeholder="Nouveau mot de passe"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-2 hover:text-text cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-2 uppercase mb-2" htmlFor="confirmPassword">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-2">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary font-sans text-sm"
                placeholder="Confirmer le nouveau mot de passe"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/95 text-on-primary px-8 py-3.5 text-sm font-semibold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          <Save className="h-4 w-4" />
          <span>{loading ? "Enregistrement..." : "Enregistrer les modifications"}</span>
        </button>
      </div>
    </form>
  );
}
