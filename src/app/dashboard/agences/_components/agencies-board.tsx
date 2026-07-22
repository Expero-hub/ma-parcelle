"use client";

import { useMemo, useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Store, X, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";

import { useRouter } from "@/hooks/use-router";
import { http, type NormalizedError } from "@/lib/http";
import { createAgencySchema } from "@/lib/validations/org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination } from "@/components/ui/paginated-table-wrapper";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CompanyOption = { id: string; name: string };
type AgencyRow = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  active: boolean;
  pointsOfSaleCount: number;
  membersCount: number;
};

const agencyFormSchema = createAgencySchema.extend({
  active: z.boolean().optional(),
});

type FormValues = z.input<typeof agencyFormSchema>;

function AgencyModal({
  open,
  mode = "create",
  initialValue,
  onClose,
  onSubmitSuccess,
}: {
  open: boolean;
  mode?: "create" | "edit";
  initialValue?: AgencyRow;
  onClose: () => void;
  onSubmitSuccess: (row: AgencyRow) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(agencyFormSchema),
    defaultValues: { name: "", phone: "", address: "", active: true },
  });

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialValue) {
        reset({
          name: initialValue.name,
          phone: initialValue.phone || "",
          address: initialValue.address || "",
          active: initialValue.active,
        });
      } else {
        reset({
          name: "",
          phone: "",
          address: "",
          active: true,
        });
      }
      setFormError(null);
    }
  }, [open, mode, initialValue, reset]);

  if (!open) return null;

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      if (mode === "edit" && initialValue) {
        const res = await http.patch<{
          data: Omit<AgencyRow, "pointsOfSaleCount" | "membersCount">;
        }>(`/agencies/${initialValue.id}`, values);
        onSubmitSuccess({
          ...res.data.data,
          pointsOfSaleCount: initialValue.pointsOfSaleCount,
          membersCount: initialValue.membersCount,
        });
      } else {
        const res = await http.post<{
          data: Omit<AgencyRow, "pointsOfSaleCount" | "membersCount">;
        }>("/agencies", values);
        onSubmitSuccess({ ...res.data.data, pointsOfSaleCount: 0, membersCount: 0 });
      }
      reset();
      onClose();
    } catch (e) {
      const err = e as NormalizedError;
      setFormError(err.message);
    }
  }

  const label = "mb-1 block text-sm font-medium text-text";
  const errCls = "mt-1 text-xs text-alert";

  return (
    <div className="fixed inset-0 z-[1700] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={isSubmitting ? undefined : onClose} aria-hidden />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="relative w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-hover)]"
        noValidate
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Fermer"
          className="absolute top-4 right-4 rounded-lg p-2 text-text-2 hover:bg-surface-2 hover:text-text disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="pr-10">
          <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Store className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-semibold text-text">
            {mode === "create" ? "Ajouter une agence" : "Modifier l'agence"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-text-2">
            {mode === "create" 
              ? "Renseignez les informations de la nouvelle agence." 
              : "Modifiez les informations de l'agence ci-dessous."}
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <div>
            <label className={label} htmlFor="agency-name">Nom</label>
            <Input id="agency-name" placeholder="Ex. Agence de Menontin" {...register("name")} />
            {errors.name && <p className={errCls}>{errors.name.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="agency-phone">Contact</label>
              <Input id="agency-phone" placeholder="Ex. 0196854785" {...register("phone")} />
              {errors.phone && <p className={errCls}>{errors.phone.message}</p>}
            </div>
            <div>
              <label className={label} htmlFor="agency-address">Adresse</label>
              <Input id="agency-address" placeholder="Ex. Menontin" {...register("address")} />
              {errors.address && <p className={errCls}>{errors.address.message}</p>}
            </div>
          </div>
          {mode === "edit" && (
            <div className="mt-2">
              <label className="flex items-center gap-3 text-sm font-medium text-text">
                <input
                  type="checkbox"
                  {...register("active")}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Agence active
              </label>
            </div>
          )}
        </div>

        {formError && <p className="mt-4 text-sm text-alert">{formError}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement..." : mode === "create" ? "Ajouter" : "Modifier"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function AgenciesBoard({
  initialRows,
  initialTotalCount,
  canCreate,
}: {
  initialRows: AgencyRow[];
  initialTotalCount: number;
  canCreate: boolean;
}) {
  const router = useRouter();

  // Local state for rows, pagination, search
  const [rows, setRows] = useState<AgencyRow[]>(initialRows);
  const [totalResults, setTotalResults] = useState(initialTotalCount);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Modals state
  const [modal, setModal] = useState<{ mode: "create" | "edit"; agency?: AgencyRow } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AgencyRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFirstRender, setIsFirstRender] = useState(true);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Reset to first page when search changes
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
        const res = await http.get<{
          data: AgencyRow[];
          meta: { total: number };
        }>(`/agencies?page=${page}&limit=${pageSize}&q=${encodeURIComponent(debouncedQuery)}`);
        
        if (active) {
          // Map backend response fields
          const formatted = res.data.data.map((agency: any) => ({
            id: agency.id,
            name: agency.name,
            address: agency.address,
            phone: agency.phone,
            active: agency.active,
            pointsOfSaleCount: agency.pointsOfSaleCount !== undefined ? agency.pointsOfSaleCount : agency._count?.pointsOfSale || 0,
            membersCount: agency.membersCount !== undefined ? agency.membersCount : agency._count?.members || 0,
          }));
          setRows(formatted);
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

  function handleCreatedOrUpdated(row: AgencyRow) {
    if (modal?.mode === "edit") {
      setRows((current) => current.map((r) => (r.id === row.id ? row : r)));
    } else {
      setRows((current) => [row, ...current.slice(0, pageSize - 1)]);
      setTotalResults((prev) => prev + 1);
    }
    router.refresh();
  }

  async function handleDeleteAgency() {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      await http.delete(`/agencies/${confirmDelete.id}`);
      setRows((current) => current.filter((r) => r.id !== confirmDelete.id));
      setTotalResults((prev) => Math.max(0, prev - 1));
      setConfirmDelete(null);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.14em] text-primary">COMPTES</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-text">Gestion des agences</h1>
          <p className="mt-2 text-sm text-text-2">Liste des agences enregistrées.</p>
        </div>
        {canCreate && (
          <Button
            type="button"
            onClick={() => setModal({ mode: "create" })}
            className="w-fit gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter une agence
          </Button>
        )}
      </div>

      <div className="mt-6">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher par nom, compagnie, contact ou adresse..."
            className="h-11 bg-surface pl-9"
          />
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead className="bg-surface-2 text-sm text-text-2">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nom</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Adresse</th>
                  <th className="px-4 py-3 font-semibold">Points de vente</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-text">
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-4 py-4 font-medium">{row.name}</td>
                    <td className="px-4 py-4 text-text-2">{row.phone ?? "-"}</td>
                    <td className="px-4 py-4 text-text-2">{row.address ?? "-"}</td>
                    <td className="px-4 py-4 text-text-2">{row.pointsOfSaleCount}</td>
                    <td className="px-4 py-4">
                      <span
                        className={
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-medium " +
                          (row.active ? "bg-secondary/15 text-secondary" : "bg-alert/15 text-alert")
                        }
                      >
                        {row.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex rounded-lg p-1.5 text-text-2 hover:bg-surface-2 disabled:opacity-50">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => setModal({ mode: "edit", agency: row })}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/agences/${row.id}/points-de-vente`)}>
                            <Store className="mr-2 h-4 w-4" />
                            Points de vente
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setConfirmDelete(row)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-text-2">
                      Aucune agence trouvée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          totalResults={totalResults}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      </div>

      <AgencyModal
        open={!!modal}
        mode={modal?.mode}
        initialValue={modal?.agency}
        onClose={() => setModal(null)}
        onSubmitSuccess={handleCreatedOrUpdated}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Supprimer l'agence ?"
        description={
          confirmDelete
            ? `Êtes-vous sûr de vouloir supprimer l'agence "${confirmDelete.name}" ? Elle sera archivée (soft-delete).`
            : undefined
        }
        confirmLabel="Supprimer"
        destructive
        loading={isDeleting}
        onConfirm={handleDeleteAgency}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
