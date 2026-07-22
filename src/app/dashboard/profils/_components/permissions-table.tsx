"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/paginated-table-wrapper";
import { http } from "@/lib/http";

type PermissionRow = {
  id: string;
  name: string;
  module: string;
  parent: string;
  url: string;
  granted: boolean;
};

export function PermissionsTable({
  profileId,
  profileName,
  isAdminProfile,
  rows: initialRows,
  initialTotalCount,
}: {
  profileId: string;
  profileName: string;
  isAdminProfile: boolean;
  rows: PermissionRow[];
  initialTotalCount: number;
}) {
  const [rows, setRows] = useState(initialRows);
  const [totalResults, setTotalResults] = useState(initialTotalCount);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [isFirstRender, setIsFirstRender] = useState(true);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Reset to first page when search/size changes
  useEffect(() => {
    if (!isFirstRender) {
      setPage(1);
    }
  }, [debouncedQuery, pageSize]);

  // Fetch paginated data
  useEffect(() => {
    if (isFirstRender) {
      setIsFirstRender(false);
      return;
    }

    let active = true;
    async function loadData() {
      try {
        const url = `/profiles/${profileId}/permissions?page=${page}&limit=${pageSize}&q=${encodeURIComponent(debouncedQuery)}`;
        const res = await http.get<{
          data: PermissionRow[];
          meta: { total: number };
        }>(url);

        if (active) {
          setRows(res.data.data);
          setTotalResults(res.data.meta.total);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [page, pageSize, debouncedQuery, profileId]);

  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));

  async function handleToggle(row: PermissionRow) {
    if (isAdminProfile || pendingIds.has(row.id)) return;

    const nextGranted = !row.granted;

    // Mise à jour optimiste
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, granted: nextGranted } : r)));
    setPendingIds((prev) => new Set(prev).add(row.id));

    try {
      const response = await fetch(`/api/profiles/${profileId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuId: row.id, grant: nextGranted }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Erreur inconnue");
      }

      toast.success(nextGranted ? "Droits accordés" : "Droits retirés");
    } catch (error) {
      // Échec : annuler le changement visuel
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, granted: !nextGranted } : r)));
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue, réessayez.");
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  }

  return (
    <>
      <div className="mb-4 relative min-w-0 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-2" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher par menu ou URL..."
          className="h-10 pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-surface-2 text-text-2">
            <tr>
              <th className="px-4 py-3 font-medium">Sous-menu</th>
              <th className="px-4 py-3 font-medium">Menu</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Rôle</th>
              <th className="px-4 py-3 font-medium">Accès</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text">
            {rows.map((row) => {
              const isPending = pendingIds.has(row.id);
              const locked = isAdminProfile || isPending;

              return (
                <tr key={row.id} className="transition-colors hover:bg-surface-2/60">
                  <td className="px-4 py-3 font-medium">
                    {row.parent === "-" ? row.name : `${row.parent} / ${row.name}`}
                  </td>
                  <td className="px-4 py-3 text-text-2">{row.module}</td>
                  <td className="px-4 py-3">
                    <code className="rounded-md bg-surface-2 px-2 py-1 text-xs text-text">
                      {row.url}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary">
                      {profileName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={row.granted}
                        aria-label={`Accès au menu ${row.name}`}
                        disabled={locked}
                        onClick={() => handleToggle(row)}
                        className={
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 " +
                          (row.granted ? "bg-secondary" : "border border-border bg-surface-2")
                        }
                      >
                        <span
                          className={
                            "inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform " +
                            (row.granted ? "translate-x-6" : "translate-x-1")
                          }
                        />
                      </button>
                      <span
                        className={
                          "text-xs font-medium " + (row.granted ? "text-secondary" : "text-alert")
                        }
                      >
                        {row.granted ? "Oui" : "Non"}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-2">
                  Aucun menu actif.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        totalResults={totalResults}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </>
  );
}
