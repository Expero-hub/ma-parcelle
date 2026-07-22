"use client";

import { useEffect, useState } from "react";
import { Search, MoreHorizontal } from "lucide-react";

import { AddZoneModal } from "@/app/dashboard/zones/_components/add-zone-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/paginated-table-wrapper";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { http, type NormalizedError } from "@/lib/http";

type ZoneRow = {
  id: string;
  code: string;
  fullAddress: string | null;
  department: string | null;
  commune: string | null;
  district: string | null;
  latitude: string;
  longitude: string;
  active: boolean;
};

type ZonesApiResponse = {
  data: ZoneRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function ZonesBoard({
  initialRows,
  initialTotalCount,
  canCreate,
}: {
  initialRows: ZoneRow[];
  initialTotalCount: number;
  canCreate: boolean;
}) {
  const [rows, setRows] = useState<ZoneRow[]>(initialRows);
  const [totalResults, setTotalResults] = useState(initialTotalCount);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingZone, setEditingZone] = useState<ZoneRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ZoneRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, pageSize]);

  useEffect(() => {
    let active = true;
    async function fetchZones() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await http.get<ZonesApiResponse>(
          `/zones?page=${page}&limit=${pageSize}&q=${encodeURIComponent(debouncedQuery)}`,
        );

        if (!active) return;

        setRows(response.data.data);
        setTotalResults(response.data.meta.total);
      } catch (err) {
        const normalized = err as NormalizedError;
        if (active) setError(normalized.message);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchZones();
    return () => {
      active = false;
    };
  }, [page, pageSize, debouncedQuery]);

  /**
   * Relance manuellement le fetch des zones, en dehors du cycle réactif de
   * l'effet ci-dessus. Utilisé après une création/modification réussie,
   * quand changer page/pageSize/debouncedQuery ne suffit pas à déclencher
   * l'effet (ex: on est déjà en page 1 sans recherche).
   */
  async function refetchZones(targetPage: number, targetPageSize: number, targetQuery: string) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.get<ZonesApiResponse>(
        `/zones?page=${targetPage}&limit=${targetPageSize}&q=${encodeURIComponent(targetQuery)}`,
      );
      setRows(response.data.data);
      setTotalResults(response.data.meta.total);
    } catch (err) {
      const normalized = err as NormalizedError;
      setError(normalized.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleZoneCreated() {
    // On revient à la vue par défaut (page 1, sans recherche) pour être sûr
    // de retrouver la zone qui vient d'être créée.
    const alreadyAtDefaultView = page === 1 && query === "" && debouncedQuery === "";
    setQuery("");
    setDebouncedQuery("");
    setPage(1);

    // Si l'état ne change pas (on était déjà en page 1 sans recherche),
    // l'effet réactif ne se redéclenchera pas tout seul : on force le fetch.
    if (alreadyAtDefaultView) {
      refetchZones(1, pageSize, "");
    }
  }

  function handleZoneUpdated() {
    // La zone modifiée est déjà sur la page affichée : pas besoin de changer
    // page/recherche, juste rafraîchir la vue courante.
    refetchZones(page, pageSize, debouncedQuery);
  }

  async function handleDelete() {
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await http.delete(`/zones/${confirmDelete.id}`);
      setRows(rows.filter((r) => r.id !== confirmDelete.id));
      setTotalResults(totalResults - 1);
      setConfirmDelete(null);
    } catch (err) {
      const normalized = err as NormalizedError;
      setError(normalized.message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-text-2" />
            <Input
              placeholder="Rechercher code, commune, quartier ou département..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="max-w-md border-border bg-surface text-text"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && <AddZoneModal onSuccess={handleZoneCreated} />}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-surface-2 text-text-2 border-b border-border">
            <tr className="divide-x divide-border">
              <th className="px-4 py-3 font-semibold w-[10%]">Code</th>
              <th className="px-4 py-3 font-semibold w-[15%]">Commune</th>
              <th className="px-4 py-3 font-semibold w-[15%]">Quartier</th>
              <th className="px-4 py-3 font-semibold w-[15%]">Département</th>
              <th className="px-4 py-3 font-semibold w-[25%]">Adresse</th>
              <th className="px-4 py-3 font-semibold w-[10%]">Latitude</th>
              <th className="px-4 py-3 font-semibold w-[10%]">Longitude</th>
              <th className="px-4 py-3 font-semibold text-right w-[10%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text">
            {rows.map((zone) => (
              <tr
                key={zone.id}
                className="divide-x divide-border hover:bg-surface-2/50 transition-colors"
              >
                <td className="px-4 py-3 font-medium">
                  <div className="max-w-[100px] truncate" title={zone.code}>
                    {zone.code}
                  </div>
                </td>
                <td className="px-4 py-3 text-text-2">
                  <div className="max-w-[150px] truncate" title={zone.commune ?? ""}>
                    {zone.commune ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3 text-text-2">
                  <div className="max-w-[150px] truncate" title={zone.district ?? ""}>
                    {zone.district ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3 text-text-2">
                  <div className="max-w-[150px] truncate" title={zone.department ?? ""}>
                    {zone.department ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3 text-text-2">
                  <div className="max-w-[280px] truncate" title={zone.fullAddress ?? ""}>
                    {zone.fullAddress ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3 text-text-2">
                  <div className="max-w-[150px] truncate" title={zone.latitude ?? ""}>
                    {zone.latitude ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3 text-text-2">
                  <div className="max-w-[150px] truncate" title={zone.longitude ?? ""}>
                    {zone.longitude ?? "—"}
                  </div>
                </td>

                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg p-1.5 text-text-2 hover:bg-surface-2 hover:text-text transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingZone(zone)}>
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setConfirmDelete(zone)}
                        className="text-alert"
                      >
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-2">
                  {isLoading
                    ? "Chargement des zones..."
                    : error
                      ? error
                      : "Aucune zone trouvée."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={page}
        totalPages={Math.max(1, Math.ceil(totalResults / pageSize))}
        totalResults={totalResults}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
      {editingZone && (
        <AddZoneModal
          open={!!editingZone}
          onOpenChange={(val) => {
            if (!val) setEditingZone(null);
          }}
          onSuccess={handleZoneUpdated}
          initialZone={{
            id: editingZone.id,
            code: editingZone.code,
            fullAddress: editingZone.fullAddress ?? "",
            department: editingZone.department ?? "",
            commune: editingZone.commune ?? "",
            district: editingZone.district ?? "",
            latitude: editingZone.latitude,
            longitude: editingZone.longitude,
          }}
          trigger={null}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Supprimer la zone ?"
        description={`La zone "${confirmDelete?.code}" sera supprimée. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        destructive
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
