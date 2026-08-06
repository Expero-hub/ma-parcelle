"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  Download,
  Search,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination } from "@/components/ui/paginated-table-wrapper";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ImportFileModal } from "../_components/import-file-modal";

type ImportFileRow = {
  id: string;
  name: string;
  type: string;
  path: string;
  processedRows: number;
  errorRows: number;
  createdAt: string;
  uploadedBy?: {
    name: string | null;
    email: string;
  };
};

export function ImportationsClient() {
  const [files, setFiles] = useState<ImportFileRow[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  const [filterType, setFilterType] = useState("");
  const [filterParcelle, setFilterParcelle] = useState("");
  const [debouncedParcelle, setDebouncedParcelle] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [debouncedClient, setDebouncedClient] = useState("");
  const [filterAgency, setFilterAgency] = useState("");
  const [agencies, setAgencies] = useState<Array<{ id: string; name: string }>>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounces
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(q);
    }, 300);
    return () => clearTimeout(handler);
  }, [q]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedParcelle(filterParcelle);
    }, 300);
    return () => clearTimeout(handler);
  }, [filterParcelle]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedClient(filterClient);
    }, 300);
    return () => clearTimeout(handler);
  }, [filterClient]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, filterType, debouncedParcelle, debouncedClient, filterAgency, pageSize]);

  // Load files function
  const loadFiles = async () => {
    try {
      const typeParam = filterType ? `&type=${filterType}` : "";
      const searchParam = debouncedQuery ? `&q=${encodeURIComponent(debouncedQuery)}` : "";
      const parcelleParam = debouncedParcelle ? `&parcelle=${encodeURIComponent(debouncedParcelle)}` : "";
      const clientParam = debouncedClient ? `&client=${encodeURIComponent(debouncedClient)}` : "";
      const agencyParam = filterAgency ? `&agency=${filterAgency}` : "";

      const url = `/api/imports/files?page=${page}&limit=${pageSize}${typeParam}${searchParam}${parcelleParam}${clientParam}${agencyParam}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.data || []);
        setTotalResults(data.meta.total || 0);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des fichiers:", err);
    }
  };

  // Fetch initial files and agencies list
  useEffect(() => {
    loadFiles();
  }, [page, pageSize, debouncedQuery, filterType, debouncedParcelle, debouncedClient, filterAgency]);

  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const res = await fetch("/api/agencies?limit=100");
        if (res.ok) {
          const data = await res.json();
          setAgencies(data.data || []);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des agences:", err);
      }
    };
    fetchAgencies();
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));

  // Date formatter matching screenshot: "08 juil. 2025 à 18:42"
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.toLocaleDateString("fr-FR", { day: "2-digit" });
    const month = date.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");
    const year = date.toLocaleDateString("fr-FR", { year: "numeric" });
    const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return `${day} ${month}. ${year} à ${time}`;
  };

  const typeLabels: Record<string, string> = {
    contrat: "Contrat",
    emission: "Emission",
    encaissement: "Encaissement",
  };

  const typeBadgeStyles: Record<string, string> = {
    contrat: "bg-primary/10 text-primary border border-primary/20",
    emission: "bg-secondary/10 text-secondary border border-secondary/20",
    encaissement: "bg-gold/10 text-gold border border-gold/20",
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/imports/files/${confirmDeleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadFiles();
      } else {
        alert("Une erreur est survenue lors de la suppression.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau ou problème de serveur.");
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 text-text max-w-7xl mx-auto w-full">
      {/* Header and Top Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.14em] text-primary uppercase">Imports</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Liste des fichiers de contrat, émissions et d'encaissements
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-sans text-sm font-semibold text-on-primary hover:bg-primary/90 transition-colors shadow-md cursor-pointer"
          >
            <Upload className="size-4" />
            Importer un fichier
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 font-sans text-sm font-semibold text-text hover:bg-surface-2 transition-colors cursor-pointer">
              <Download className="size-4" />
              Télécharger Template
              <ChevronDown className="size-4 text-text-2" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => window.open("/templates/modele-contrats.xlsx", "_blank")}
                className="cursor-pointer"
              >
                Modèle Contrats
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open("/templates/modele-emissions.xlsx", "_blank")}
                className="cursor-pointer"
              >
                Modèle Émissions
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open("/templates/modele-encaissements.xlsx", "_blank")}
                className="cursor-pointer"
              >
                Modèle Encaissements
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters Form Panel */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5 bg-surface p-4 rounded-2xl border border-border shadow-sm">
        {/* Name Search */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text">Recherche par référence</label>
          <div className="relative">
            <Input
              placeholder="Nom du fichier..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8 text-sm h-10"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-text-2" />
          </div>
        </div>

        {/* Type Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text">Type de fichier</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary cursor-pointer appearance-none"
            style={{ backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%235A554C\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3E%3C/svg%3E")', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem', backgroundRepeat: 'no-repeat', paddingRight: '2rem' }}
          >
            <option value="">Tous les types</option>
            <option value="contrat">Contrat</option>
            <option value="emission">Emission</option>
            <option value="encaissement">Encaissement</option>
          </select>
        </div>

        {/* Parcelle Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text">Parcelle</label>
          <Input
            placeholder="Référence parcelle..."
            value={filterParcelle}
            onChange={(e) => setFilterParcelle(e.target.value)}
            className="text-sm h-10"
          />
        </div>

        {/* Client Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text">Client</label>
          <Input
            placeholder="Nom ou email..."
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="text-sm h-10"
          />
        </div>

        {/* Agency Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text">Agence</label>
          <select
            value={filterAgency}
            onChange={(e) => setFilterAgency(e.target.value)}
            className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary cursor-pointer appearance-none"
            style={{ backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%235A554C\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3E%3C/svg%3E")', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem', backgroundRepeat: 'no-repeat', paddingRight: '2rem' }}
          >
            <option value="">Toutes les agences</option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Files Table Card */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-surface-2 text-text-2 border-b border-border">
            <tr>
              <th className="px-4 py-3.5 font-semibold">Nom du fichier</th>
              <th className="px-4 py-3.5 font-semibold">Type</th>
              <th className="px-4 py-3.5 font-semibold">Etat</th>
              <th className="px-4 py-3.5 font-semibold">Lignes traitée(s)</th>
              <th className="px-4 py-3.5 font-semibold">Lignes erronée(s)</th>
              <th className="px-4 py-3.5 font-semibold">Date d'import</th>
              <th className="px-4 py-3.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text">
            {files.map((file) => (
              <tr key={file.id} className="transition-colors hover:bg-surface-2/45">
                <td className="px-4 py-3.5 font-medium truncate max-w-[220px]" title={file.name}>
                  {file.name}
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${typeBadgeStyles[file.type] || "bg-surface-2 text-text-2 border-border"}`}>
                    {typeLabels[file.type] || file.type}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold">
                    Fichier ventilé
                  </span>
                </td>
                <td className="px-4 py-3.5 font-mono font-medium">
                  {file.processedRows}
                </td>
                <td className="px-4 py-3.5 font-mono font-medium text-alert">
                  {file.errorRows}
                </td>
                <td className="px-4 py-3.5 text-text-2">
                  {formatDate(file.createdAt)}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label="Actions"
                      className="inline-flex rounded-lg p-1.5 text-text-2 hover:bg-surface-2 cursor-pointer transition-colors"
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => window.location.href = `/api/imports/files/${file.id}/download`}
                        className="cursor-pointer"
                      >
                        Télécharger le fichier
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setConfirmDeleteId(file.id)}
                        className="text-alert cursor-pointer font-medium"
                      >
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
            {files.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-text-2 font-medium">
                  Aucun fichier importé trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        totalResults={totalResults}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />

      {/* Import File Dialog Modal */}
      <ImportFileModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            loadFiles();
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Supprimer le fichier ?"
        description="Le fichier d'origine sera définitivement supprimé du stockage cloud et son historique d'importation sera effacé. Les entités insérées lors de son import ne seront pas altérées."
        confirmLabel="Supprimer"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
