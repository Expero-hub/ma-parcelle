"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { MapPin, Phone, Plus, Store, Edit, Trash2, MoreHorizontal, Users, UserPlus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PointOfSaleModal, type PointOfSaleFormValue } from "./point-of-sale-modal";
import { AssignMemberModal, ViewMembersModal } from "./personnel-modals";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination } from "@/components/ui/paginated-table-wrapper";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { http } from "@/lib/http";

type MemberUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

type PointOfSaleMember = {
  id: string;
  user: MemberUser;
};

type PointOfSale = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  active: boolean;
  members: PointOfSaleMember[];
};

type UserOption = {
  id: string;
  name: string;
};

export function PointsOfSaleList({
  agencyId,
  initialPointsOfSale,
  initialTotalCount,
  canCreate,
  agencyUsers,
}: {
  agencyId: string;
  initialPointsOfSale: PointOfSale[];
  initialTotalCount: number;
  canCreate: boolean;
  agencyUsers: UserOption[];
}) {
  const [pointsOfSale, setPointsOfSale] = useState<PointOfSale[]>(initialPointsOfSale);
  const [totalResults, setTotalResults] = useState(initialTotalCount);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Modals States
  const [posModal, setPosModal] = useState<{ mode: "create" | "edit"; pos?: PointOfSale } | null>(null);
  const [assignModalPosId, setAssignModalPosId] = useState<string | null>(null);
  const [viewMembersPos, setViewMembersPos] = useState<PointOfSale | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PointOfSale | null>(null);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
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

  // Fetch paginated data from backend
  useEffect(() => {
    if (isFirstRender) {
      setIsFirstRender(false);
      return;
    }

    let active = true;
    async function loadData() {
      try {
        const url = `/agencies/${agencyId}/points-of-sale?page=${page}&limit=${pageSize}&q=${encodeURIComponent(debouncedQuery)}`;
        const res = await http.get<{
          data: PointOfSale[];
          meta: { total: number };
        }>(url);

        if (active) {
          setPointsOfSale(res.data.data);
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
  }, [page, pageSize, debouncedQuery, agencyId]);

  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));

  // Ajouter / Modifier Point de vente
  async function handleSubmitPos(value: PointOfSaleFormValue) {
    setLoading(true);
    setError(null);

    const isEdit = posModal?.mode === "edit";
    const posId = posModal?.pos?.id;

    try {
      const url = isEdit
        ? `/api/agencies/${agencyId}/points-of-sale/${posId}`
        : `/api/agencies/${agencyId}/points-of-sale`;
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Une erreur est survenue.");
      }

      if (isEdit) {
        setPointsOfSale((prev) =>
          prev.map((pos) =>
            pos.id === posId ? { ...pos, ...data.pointOfSale } : pos
          )
        );
        toast.success("Point de vente modifié");
      } else {
        setPointsOfSale((prev) =>
          [{ ...data.pointOfSale, members: [] }, ...prev.slice(0, pageSize - 1)]
        );
        setTotalResults((prev) => prev + 1);
        toast.success("Point de vente ajouté");
      }
      setPosModal(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  // Supprimer Point de vente
  async function handleDeletePos() {
    if (!confirmDelete) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/agencies/${agencyId}/points-of-sale/${confirmDelete.id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Impossible de supprimer ce point de vente.");
      }

      setPointsOfSale((prev) => prev.filter((pos) => pos.id !== confirmDelete.id));
      setTotalResults((prev) => Math.max(0, prev - 1));
      toast.success("Point de vente supprimé");
      setConfirmDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  // Assigner personnel
  async function handleAssignUser(userId: string) {
    if (!assignModalPosId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/agencies/${agencyId}/points-of-sale/${assignModalPosId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Impossible d'assigner l'utilisateur.");
      }

      setPointsOfSale((prev) =>
        prev.map((pos) =>
          pos.id === assignModalPosId ? { ...pos, members: [...pos.members, data.member] } : pos
        )
      );
      toast.success("Personnel assigné");
      setAssignModalPosId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  // Dissocier personnel
  async function handleUnassignUser(userId: string) {
    if (!viewMembersPos) return;
    setDeletingUserId(userId);
    try {
      const response = await fetch(
        `/api/agencies/${agencyId}/points-of-sale/${viewMembersPos.id}/members?userId=${userId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Impossible de retirer cet utilisateur.");
      }

      // Mettre à jour l'état local pour la liste et pour le modal de visualisation
      setPointsOfSale((prev) =>
        prev.map((pos) =>
          pos.id === viewMembersPos.id
            ? { ...pos, members: pos.members.filter((m) => m.user.id !== userId) }
            : pos
        )
      );
      setViewMembersPos((prev) =>
        prev ? { ...prev, members: prev.members.filter((m) => m.user.id !== userId) } : null
      );
      toast.success("Personnel dissocié");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue.";
      toast.error(message);
    } finally {
      setDeletingUserId(null);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher par nom, adresse, téléphone..."
            className="h-10 pl-9"
          />
        </div>
        {canCreate && (
          <Button onClick={() => setPosModal({ mode: "create" })} className="h-10 gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un point de vente
          </Button>
        )}
      </div>

      {pointsOfSale.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-text-2">
          Aucun point de vente trouvé.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left text-sm">
              <thead className="bg-surface-2 text-text-2">
                <tr>
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">Adresse</th>
                  <th className="px-4 py-3 font-medium">Téléphone</th>
                  <th className="px-4 py-3 font-medium">Personnel</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {pointsOfSale.map((point) => (
                  <tr key={point.id} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-4 py-4 font-medium">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-text-2" />
                        {point.name}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-text-2">
                      {point.address ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {point.address}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-4 text-text-2">
                      {point.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          {point.phone}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-4 text-text-2 font-medium">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Users className="h-3.5 w-3.5 text-text-2" />
                        {point.members.length} assigné{point.members.length > 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium " +
                          (point.active ? "bg-secondary/15 text-secondary" : "bg-alert/15 text-alert")
                        }
                      >
                        {point.active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex rounded-lg p-1.5 text-text-2 hover:bg-surface-2">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => setPosModal({ mode: "edit", pos: point })}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setAssignModalPosId(point.id)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Assigner du personnel
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setViewMembersPos(point)}>
                            <Users className="mr-2 h-4 w-4" />
                            Voir le personnel
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setConfirmDelete(point)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        totalResults={totalResults}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />

      {/* Modals */}
      <PointOfSaleModal
        open={!!posModal}
        mode={posModal?.mode}
        initialValue={posModal?.pos}
        loading={loading}
        error={error}
        onSubmit={handleSubmitPos}
        onClose={() => {
          setPosModal(null);
          setError(null);
        }}
      />

      <AssignMemberModal
        open={!!assignModalPosId}
        loading={loading}
        error={error}
        agencyUsers={agencyUsers}
        onSubmit={handleAssignUser}
        onClose={() => {
          setAssignModalPosId(null);
          setError(null);
        }}
      />

      <ViewMembersModal
        open={!!viewMembersPos}
        posName={viewMembersPos?.name ?? ""}
        members={viewMembersPos?.members ?? []}
        onDelete={handleUnassignUser}
        deletingUserId={deletingUserId}
        onClose={() => setViewMembersPos(null)}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Supprimer le point de vente ?"
        description={
          confirmDelete
            ? `Êtes-vous sûr de vouloir supprimer le point de vente "${confirmDelete.name}" ? Cette action est définitive.`
            : undefined
        }
        confirmLabel="Supprimer"
        destructive
        loading={loading}
        onConfirm={handleDeletePos}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
