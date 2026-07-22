"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";

import { useRouter } from "@/hooks/use-router";
import { useUserActions } from "@/hooks/use-user-actions";
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
import { http } from "@/lib/http";

type Row = {
  id: string;
  name: string;
  email: string;
  companyName: string;
  active: boolean;
};

export function ClientsTable({
  rows: initialRows,
  initialTotalCount,
}: {
  rows: Row[];
  initialTotalCount: number;
}) {
  const router = useRouter();
  const { busyId, toggleActive, remove } = useUserActions();

  const [rows, setRows] = useState<Row[]>(initialRows);
  const [totalResults, setTotalResults] = useState(initialTotalCount);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [confirm, setConfirm] = useState<{ id: string; name: string; hard: boolean } | null>(null);
  const [isFirstRender, setIsFirstRender] = useState(true);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(q);
    }, 300);
    return () => clearTimeout(handler);
  }, [q]);

  // Reset to page 1 on query or size changes
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
        const url = `/users?page=${page}&limit=${pageSize}&q=${encodeURIComponent(debouncedQuery)}&clientOnly=true`;
        const res = await http.get<{
          data: any[];
          meta: { total: number };
        }>(url);

        if (active) {
          const mapped = res.data.data.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            companyName: u.company?.name || "—",
            active: u.active,
          }));
          setRows(mapped);
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
  }, [page, pageSize, debouncedQuery]);

  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));

  async function onConfirmDelete() {
    if (!confirm) return;
    await remove(confirm.id, confirm.hard);
    setRows((current) => current.filter((r) => r.id !== confirm.id));
    setTotalResults((prev) => Math.max(0, prev - 1));
    setConfirm(null);
  }

  return (
    <div>
      <div className="mb-4">
        <Input
          placeholder="Rechercher nom, email ou compagnie…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-surface-2 text-text-2 border-b border-border">
            <tr>
              <th className="px-4 py-3 font-semibold w-[25%]">Nom</th>
              <th className="px-4 py-3 font-semibold w-[25%]">Email</th>
              <th className="px-4 py-3 font-semibold w-[25%]">Compagnie</th>
              <th className="px-4 py-3 font-semibold w-[15%]">Statut</th>
              <th className="px-4 py-3 text-right font-semibold w-[10%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text">
            {rows.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-surface-2/60">
                <td className="px-4 py-3 font-medium">
                  <div className="truncate" title={r.name}>{r.name}</div>
                </td>
                <td className="px-4 py-3 text-text-2">
                  <div className="truncate" title={r.email}>{r.email}</div>
                </td>
                <td className="px-4 py-3 text-text-2">
                  <div className="truncate" title={r.companyName}>{r.companyName}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-medium " +
                      (r.active ? "bg-secondary/15 text-secondary" : "bg-alert/15 text-alert")
                    }
                  >
                    {r.active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label="Actions"
                      disabled={busyId === r.id}
                      className="inline-flex rounded-lg p-1.5 text-text-2 hover:bg-surface-2 disabled:opacity-50"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/utilisateurs/${r.id}`)}>
                        Détail
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/utilisateurs/${r.id}/modifier`)}>
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActive(r.id, r.active)}>
                        {r.active ? "Désactiver" : "Activer"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setConfirm({ id: r.id, name: r.name, hard: false })}>
                        Supprimer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setConfirm({ id: r.id, name: r.name, hard: true })}
                        className="text-alert"
                      >
                        Supprimer définitivement
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-2">Aucun client trouvé.</td>
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

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.hard ? "Supprimer définitivement ?" : "Supprimer le client ?"}
        description={
          confirm?.hard
            ? `${confirm?.name} sera supprimé définitivement. Cette action est irréversible.`
            : `${confirm?.name} sera désactivé et masqué des listes. Cette action est réversible.`
        }
        confirmLabel={confirm?.hard ? "Supprimer définitivement" : "Supprimer"}
        destructive={confirm?.hard}
        loading={busyId === confirm?.id}
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
