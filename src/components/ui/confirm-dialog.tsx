"use client";

import { Button } from "@/components/ui/button";

/** Boîte de dialogue de confirmation (contrôlée). Rendue au-dessus du top loader. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[1700] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/50" onClick={loading ? undefined : onCancel} aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-hover)]">
        <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
        {description && <p className="mt-2 text-sm text-text-2">{description}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Annuler
          </Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={onConfirm} disabled={loading}>
            {loading ? "…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
