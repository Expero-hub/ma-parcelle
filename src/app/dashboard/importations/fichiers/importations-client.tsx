"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Download,
  Eye,
  FileText,
  CalendarClock,
  Wallet
} from "lucide-react";

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

export function ImportationsClient() {
  const router = useRouter();
  const [fileType, setFileType] = useState<"Contrat" | "Émission" | "Encaissement">("Contrat");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setReport(null);
    setGlobalError(null);
  };

  const getTemplateLink = () => {
    if (fileType === "Contrat") return "/templates/modele-contrats.xlsx";
    if (fileType === "Émission") return "/templates/modele-emissions.xlsx";
    return "/templates/modele-encaissements.xlsx";
  };

  const getListLink = () => {
    if (fileType === "Contrat") return "/dashboard/importations/liste-des-contrats";
    if (fileType === "Émission") return "/dashboard/importations/liste-des-emissions";
    return "/dashboard/importations/liste-des-encaissements";
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
      }
    } catch (err) {
      console.error("Erreur d'importation :", err);
      setGlobalError("Erreur réseau ou problème de serveur lors de l'envoi du fichier.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 text-text max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <p className="font-mono text-xs font-medium tracking-[0.14em] text-primary uppercase">Imports</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
          Centralisation des Fichiers
        </h1>
        <p className="mt-2 font-sans text-sm text-text-2">
          Importez l'historique de vos contrats, émissions et encaissements depuis vos fichiers Excel.
        </p>
      </div>

      {/* Grid structure: Left form, Right templates info */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Form Panel */}
        <div className="md:col-span-2 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="size-5 text-primary" />
            Importer un fichier de données
          </h2>

          {globalError && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-600 font-medium">
              {globalError}
            </div>
          )}

          {report ? (
            <div className="space-y-4">
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
                <div className="max-h-72 overflow-y-auto rounded-xl border border-border bg-surface-2 p-3 space-y-2 text-xs">
                  <h4 className="font-semibold text-text mb-2">Détails de l'import :</h4>
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
                  onClick={resetState}
                  className="rounded-xl border border-border bg-surface-2 px-5 py-2.5 font-sans text-sm font-semibold text-text hover:bg-border transition-colors cursor-pointer"
                >
                  Importer un autre fichier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    router.push(getListLink());
                    router.refresh();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 font-sans text-sm font-semibold text-white hover:bg-emerald-800 transition-colors shadow-md cursor-pointer"
                >
                  <Eye className="size-4" />
                  Voir la liste
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-xs font-semibold text-text">
                  Type de données à importer
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: "Contrat", label: "Contrats", icon: <FileText className="size-4" /> },
                    { type: "Émission", label: "Émissions", icon: <CalendarClock className="size-4" /> },
                    { type: "Encaissement", label: "Encaissements", icon: <Wallet className="size-4" /> }
                  ].map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => {
                        setFileType(opt.type as any);
                        setSelectedFile(null);
                      }}
                      className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border font-sans text-xs font-bold transition-all cursor-pointer ${
                        fileType === opt.type
                          ? "bg-primary/10 border-primary text-primary shadow-xs"
                          : "border-border bg-surface-2 hover:bg-surface-2/80 text-text-2 hover:text-text"
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-xs font-semibold text-text">
                  Fichier de données (.xlsx, .xls, .csv)
                </label>
                <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary bg-surface-2 rounded-2xl p-8 text-center transition-colors cursor-pointer group">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    required
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-surface border border-border group-hover:border-primary text-text-2 group-hover:text-primary transition-all mb-3">
                    <FileSpreadsheet className="size-6" />
                  </div>
                  {selectedFile ? (
                    <div>
                      <span className="block text-sm font-semibold text-text truncate max-w-[280px]">
                        {selectedFile.name}
                      </span>
                      <span className="block text-xs text-text-2 mt-1">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="block text-sm font-semibold text-text">
                        Cliquez ou glissez-déposez votre fichier
                      </span>
                      <span className="block text-xs text-text-2 mt-1">
                        Format .xlsx, .xls ou .csv uniquement
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                <a
                  href={getTemplateLink()}
                  download={`modele-${fileType.toLowerCase()}s.xlsx`}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 font-sans text-sm font-semibold text-text hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  <Download className="size-4" />
                  Template {fileType}
                </a>

                <button
                  type="submit"
                  disabled={loading || !selectedFile}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-sans text-sm font-semibold text-on-primary hover:bg-primary/90 transition-colors shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Upload className="size-4" />
                  {loading ? "Importation..." : "Lancer l'importation"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Templates Box */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-display text-base font-bold mb-3 flex items-center gap-2 text-text">
              <Download className="size-4.5 text-primary" />
              Modèles de fichiers
            </h3>
            <p className="font-sans text-xs text-text-2 leading-relaxed mb-4">
              Pour garantir le bon traitement de vos données, veuillez utiliser les en-têtes exacts spécifiés dans nos fichiers modèles.
            </p>

            <div className="space-y-3">
              {[
                { type: "Contrat", label: "Modèle Contrats", desc: "Format des contrats clients", link: "/templates/modele-contrats.xlsx" },
                { type: "Émission", label: "Modèle Émissions", desc: "Échéances d'appels de fonds", link: "/templates/modele-emissions.xlsx" },
                { type: "Encaissement", label: "Modèle Encaissements", desc: "Suivi des encaissements effectifs", link: "/templates/modele-encaissements.xlsx" }
              ].map((tmpl) => (
                <a
                  key={tmpl.type}
                  href={tmpl.link}
                  download
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-2 hover:bg-border/60 transition-colors cursor-pointer text-left"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-surface text-primary border border-border">
                    <FileSpreadsheet className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-text truncate">{tmpl.label}</span>
                    <span className="block text-[10px] text-text-2 truncate">{tmpl.desc}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-text-2">
            <span className="font-semibold text-text block mb-1">Règles d'Import :</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>Pas de transactions globales bloquantes (ligne par ligne).</li>
              <li>Les warnings ne bloquent pas la création de la ligne.</li>
              <li>Vérifiez la cohérence des références.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
