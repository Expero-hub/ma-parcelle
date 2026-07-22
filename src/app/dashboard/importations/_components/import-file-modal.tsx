"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertTriangle, CheckCircle2, XCircle, FileSpreadsheet, Eye } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ImportReport = {
  success: boolean;
  summary: { total: number; created: number; skipped: number; errors: number };
  rows: Array<{
    line: number;
    status: "created" | "skipped" | "error";
    reference?: string;
    message?: string;
    warnings?: string[];
  }>;
  message?: string;
};

export function ImportFileModal({
  open,
  onOpenChange,
  defaultFileType = "Contrat",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFileType?: "Contrat" | "Émission" | "Encaissement";
}) {
  const router = useRouter();
  const [fileType, setFileType] = useState(defaultFileType);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setLoading(false);
    setReport(null);
    setGlobalError(null);
  };

  const handleModalClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setGlobalError("Veuillez sélectionner un fichier Excel ou CSV.");
      return;
    }

    setLoading(true);
    setGlobalError(null);
    setReport(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    let endpoint = "/api/imports/contracts";
    if (fileType === "Émission") endpoint = "/api/imports/installments";
    else if (fileType === "Encaissement") endpoint = "/api/imports/payments";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok && !data.rows) {
        setGlobalError(data.message || "Une erreur est survenue lors de l'importation.");
      } else {
        setReport(data);
        if (data.summary?.created > 0) {
          router.refresh();
        }
      }
    } catch (err) {
      console.error("Erreur d'importation :", err);
      setGlobalError("Erreur réseau ou problème de serveur lors de l'envoi du fichier.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl text-text">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
          <div>
            <DialogTitle className="font-display text-xl font-bold text-text flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              Importer un fichier Excel ({fileType}s)
            </DialogTitle>
            <DialogDescription className="mt-1 font-sans text-xs text-text-2">
              Sélectionnez un fichier .xlsx ou .csv conforme pour intégrer vos données en base.
            </DialogDescription>
          </div>
        </DialogHeader>

        {globalError && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-600 font-medium">
            {globalError}
          </div>
        )}

        {/* Affichage du rapport après import */}
        {report ? (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="rounded-xl border border-border bg-surface-2 p-3">
                <span className="block text-xs text-text-2 font-medium">Total</span>
                <span className="font-mono text-lg font-bold text-text">
                  {report.summary.total}
                </span>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <span className="block text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Créés
                </span>
                <span className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {report.summary.created}
                </span>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <span className="block text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Ignorés
                </span>
                <span className="font-mono text-lg font-bold text-amber-600 dark:text-amber-400">
                  {report.summary.skipped}
                </span>
              </div>
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                <span className="block text-xs text-red-600 dark:text-red-400 font-medium">
                  Erreurs
                </span>
                <span className="font-mono text-lg font-bold text-red-600 dark:text-red-400">
                  {report.summary.errors}
                </span>
              </div>
            </div>

            {report.rows && report.rows.length > 0 && (
              <div className="max-h-60 overflow-y-auto rounded-xl border border-border bg-surface-2 p-3 space-y-2 text-xs">
                <h4 className="font-semibold text-text mb-2">Détails ligne par ligne :</h4>
                {report.rows.map((r, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-1 p-2 rounded-lg bg-surface border border-border/60"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text">
                        Ligne {r.line} {r.reference ? `(${r.reference})` : ""}
                      </span>
                      {r.status === "created" && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                          <CheckCircle2 className="size-3.5" /> Succès
                        </span>
                      )}
                      {r.status === "skipped" && (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
                          <AlertTriangle className="size-3.5" /> Ignoré
                        </span>
                      )}
                      {r.status === "error" && (
                        <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                          <XCircle className="size-3.5" /> Erreur
                        </span>
                      )}
                    </div>

                    {r.message && <p className="text-text-2">{r.message}</p>}

                    {r.warnings && r.warnings.length > 0 && (
                      <div className="mt-1 text-amber-600 bg-amber-500/10 p-1.5 rounded font-medium">
                        {r.warnings.join(" | ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReport(null);
                  setSelectedFile(null);
                }}
                className="rounded-xl border border-border bg-surface-2 px-5 py-2.5 font-sans text-sm font-semibold text-text hover:bg-border transition-colors cursor-pointer"
              >
                Importer un autre fichier
              </button>
              <button
                type="button"
                onClick={() => {
                  handleModalClose(false);
                  router.refresh();
                  window.location.reload();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 font-sans text-sm font-semibold text-white hover:bg-emerald-800 transition-colors shadow-md cursor-pointer"
              >
                <Eye className="size-4" />
                Voir la liste
              </button>
            </div>
          </div>
        ) : (
          /* Formulaire de sélection */
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-xs font-semibold text-text">
                Type de fichier
              </label>
              <select
                value={fileType}
                onChange={(e) =>
                  setFileType(e.target.value as "Contrat" | "Émission" | "Encaissement")
                }
                className="h-11 rounded-xl border border-border bg-surface-2 px-3.5 font-sans text-sm outline-none focus:border-primary text-text cursor-pointer"
              >
                <option value="Contrat">Contrat</option>
                <option value="Émission">Émission</option>
                <option value="Encaissement">Encaissement</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-xs font-semibold text-text">
                Fichier Excel (.xlsx, .csv)
              </label>
              <div className="relative flex h-14 items-center rounded-xl border border-border bg-surface-2 px-3">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs font-medium text-text cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-surface file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-text file:shadow-xs hover:file:bg-surface-2"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleModalClose(false)}
                disabled={loading}
                className="rounded-xl border border-border bg-surface-2 px-5 py-2.5 font-sans text-sm font-semibold text-text hover:bg-border transition-colors cursor-pointer disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || !selectedFile}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-sans text-sm font-semibold text-on-primary hover:bg-primary/90 transition-colors shadow-md cursor-pointer disabled:opacity-50"
              >
                <Upload className="size-4" />
                {loading ? "Importation en cours..." : "Lancer l'importation"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
