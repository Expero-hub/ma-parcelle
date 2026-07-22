"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type PointOfSaleFormValue = {
  name: string;
  address: string | null;
  phone: string | null;
  active?: boolean;
};

export function PointOfSaleModal({
  open,
  mode = "create",
  initialValue,
  loading,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  mode?: "create" | "edit";
  initialValue?: PointOfSaleFormValue;
  loading?: boolean;
  error?: string | null;
  onSubmit: (value: PointOfSaleFormValue) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const title = mode === "create" ? "Ajouter un point de vente" : "Modifier le point de vente";
  const desc = mode === "create" 
    ? "Renseignez les informations du nouveau point de vente." 
    : "Modifiez les informations du point de vente ci-dessous.";

  return (
    <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/55" onClick={loading ? undefined : onClose} aria-label="Fermer" />
      <form
        key={`${mode}-${initialValue?.name ?? "new"}`}
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-hover)]"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSubmit({
            name: String(form.get("name") ?? ""),
            address: String(form.get("address") ?? "") || null,
            phone: String(form.get("phone") ?? "") || null,
            active: mode === "edit" ? form.get("active") === "on" : true,
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
        <p className="mt-2 max-w-sm text-sm text-text-2">{desc}</p>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <label htmlFor="pos-name" className="block text-sm font-semibold text-text">
              Nom
            </label>
            <Input
              id="pos-name"
              name="name"
              required
              autoFocus
              defaultValue={initialValue?.name ?? ""}
              placeholder="Ex : Point de vente Fidjrossè"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="pos-address" className="block text-sm font-semibold text-text">
              Adresse
            </label>
            <Input
              id="pos-address"
              name="address"
              defaultValue={initialValue?.address ?? ""}
              placeholder="Adresse du point de vente"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="pos-phone" className="block text-sm font-semibold text-text">
              Téléphone
            </label>
            <Input
              id="pos-phone"
              name="phone"
              type="tel"
              defaultValue={initialValue?.phone ?? ""}
              placeholder="+229 XX XX XX XX"
              className="h-11"
            />
          </div>

          {mode === "edit" && (
            <div className="mt-2">
              <label className="flex items-center gap-3 text-sm font-medium text-text">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={initialValue?.active ?? true}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Point de vente actif
              </label>
            </div>
          )}

          {error && <p className="rounded-lg bg-alert/10 px-3 py-2 text-sm text-alert">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "..." : mode === "create" ? "Ajouter" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
