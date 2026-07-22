"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ProfileFormValue = {
  name: string;
  description?: string | null;
  active?: boolean;
};

export function ProfileModal({
  open,
  mode,
  initialValue,
  loading,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  initialValue?: ProfileFormValue;
  loading?: boolean;
  error?: string | null;
  onSubmit: (value: ProfileFormValue) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const title = mode === "create" ? "Ajouter un profil" : "Modifier le profil";
  const descriptionText =
    mode === "create"
      ? "Remplissez le formulaire ci-dessous pour creer un nouveau profil staff."
      : "Modifiez les informations du profil ci-dessous.";

  return (
    <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/55" onClick={loading ? undefined : onClose} aria-label="Fermer" />
      <form
        key={`${mode}-${initialValue?.name ?? "new"}`}
        className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-hover)]"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSubmit({
            name: String(form.get("name") ?? ""),
            description: String(form.get("description") ?? ""),
            active: form.get("active") === "on",
          });
        }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-text-2 hover:bg-surface-2 hover:text-text disabled:opacity-50"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="font-display text-xl font-semibold text-text">{title}</h2>
        <p className="mt-2 max-w-sm text-sm text-text-2">{descriptionText}</p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="profile-name" className="mb-2 block text-sm font-semibold text-text">
              Libelle
            </label>
            <Input
              id="profile-name"
              name="name"
              defaultValue={initialValue?.name ?? ""}
              autoFocus
              required
              className="h-11"
            />
          </div>
          <div>
            <label htmlFor="profile-description" className="mb-2 block text-sm font-semibold text-text">
              Description
            </label>
            <textarea
              id="profile-description"
              name="description"
              defaultValue={initialValue?.description ?? ""}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Ex. Gerant d'agence, agent commercial..."
            />
          </div>
          <label className="flex items-center gap-3 text-sm font-medium text-text">
            <input
              name="active"
              type="checkbox"
              defaultChecked={initialValue?.active ?? true}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Profil actif
          </label>
          {error && <p className="rounded-lg bg-alert/10 px-3 py-2 text-sm text-alert">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "..." : mode === "create" ? "Creer" : "Mettre a jour"}
          </Button>
        </div>
      </form>
    </div>
  );
}
