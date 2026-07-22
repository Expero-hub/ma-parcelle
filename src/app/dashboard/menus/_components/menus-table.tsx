"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, PlusCircle } from "lucide-react";

import { MenuIcon } from "@/components/dashboard/menu-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/hooks/use-router";
import { http, type NormalizedError } from "@/lib/http";
import { ClientPagination, getPageItems } from "./client-pagination";
import {
  MenuModal,
  type EditableMenu,
  type MenuFormValue,
  type MenuOption,
  type ModuleOption,
} from "./menu-modal";

type MenuRow = {
  id: string;
  label: number;
  name: string;
  icon: string | null;
  url: string | null;
  moduleId: string;
  module: string;
  parentId: string | null;
  parent: string | null;
  order: number;
  active: boolean;
};

export function MenusTable({ rows, modules }: { rows: MenuRow[]; modules: ModuleOption[] }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; menu?: EditableMenu } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pagination = useMemo(() => getPageItems(rows, page, pageSize), [page, pageSize, rows]);
  const menuOptions = useMemo<MenuOption[]>(
    () => rows.map((row) => ({ id: row.id, name: row.name, moduleId: row.moduleId })),
    [rows],
  );

  function openCreateModal() {
    setError(null);
    setModal({ mode: "create" });
  }

  function openEditModal(row: MenuRow) {
    setError(null);
    setModal({
      mode: "edit",
      menu: {
        id: row.id,
        name: row.name,
        moduleId: row.moduleId,
        parentId: row.parentId,
        url: row.url,
        icon: row.icon,
        order: row.order,
        active: row.active,
      },
    });
  }

  async function submitMenu(value: MenuFormValue) {
    const editing = modal?.mode === "edit" ? modal.menu : undefined;
    setError(null);
    setPendingId(editing?.id ?? "create");

    try {
      if (editing) await http.patch(`/menus/${editing.id}`, value);
      else await http.post("/menus", value);

      setModal(null);
      router.refresh();
    } catch (caught) {
      const normalized = caught as NormalizedError;
      setError(normalized.fieldErrors?.name ?? normalized.message);
    } finally {
      setPendingId(null);
    }
  }

  async function toggleActive(row: MenuRow) {
    setError(null);
    setPendingId(row.id);

    try {
      if (row.active) {
        await http.delete(`/menus/${row.id}`);
      } else {
        await http.patch(`/menus/${row.id}`, {
          name: row.name,
          moduleId: row.moduleId,
          parentId: row.parentId || null,
          url: row.url || null,
          icon: row.icon || null,
          order: typeof row.order === "number" ? row.order : undefined,
          active: true,
        });
      }
      router.refresh();
    } catch (caught) {
      setError((caught as NormalizedError).message);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Button type="button" className="h-10" onClick={openCreateModal}>
          <PlusCircle className="h-4 w-4" />
          Ajouter un menu
        </Button>
      </div>

      {error && !modal && <p className="mb-4 rounded-lg bg-alert/10 px-3 py-2 text-sm text-alert">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-surface-2 text-text-2">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Icone</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Module</th>
              <th className="px-4 py-3 font-medium">Parent</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagination.items.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3 text-text">{row.label}</td>
                <td className="px-4 py-3 font-medium text-text">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${row.active ? "bg-secondary" : "bg-text-2"}`}
                      aria-hidden="true"
                    />
                    {row.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-2">
                  <span className="inline-flex items-center gap-2">
                    <MenuIcon name={row.icon} className="h-4 w-4" />
                    {row.icon ?? "-"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {row.url ? (
                    <code className="rounded-md bg-surface-2 px-2 py-1 text-xs text-text">{row.url}</code>
                  ) : (
                    <span className="text-text-2">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-2">{row.module}</td>
                <td className="px-4 py-3 text-text-2">{row.parent ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`Actions pour ${row.name}`}
                      disabled={pendingId === row.id}
                      className="inline-flex rounded-lg p-1.5 text-text-2 hover:bg-surface-2 disabled:opacity-50"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[140px]">
                      <DropdownMenuItem
                        onClick={() => openEditModal(row)}
                        className="cursor-pointer"
                      >
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={pendingId === row.id}
                        className={`cursor-pointer ${row.active ? "text-alert" : "text-secondary"}`}
                        onClick={() => toggleActive(row)}
                      >
                        {row.active ? "Desactiver" : "Activer"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
            {pagination.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-2">
                  Aucun menu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ClientPagination
        page={pagination.currentPage}
        pageSize={pageSize}
        total={rows.length}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
      />
      <p className="mt-2 text-sm text-text-2">{rows.length} resultat(s) affiche(s)</p>

      <MenuModal
        open={!!modal}
        mode={modal?.mode ?? "create"}
        menu={modal?.menu}
        modules={modules}
        menus={menuOptions}
        loading={pendingId === "create" || pendingId === modal?.menu?.id}
        error={error}
        onSubmit={submitMenu}
        onClose={() => {
          setModal(null);
          setError(null);
        }}
      />
    </div>
  );
}
