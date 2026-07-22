"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { ClientPagination, getPageItems } from "./client-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ModuleRow = {
  id: string;
  label: number;
  name: string;
  active: boolean;
  menusCount: number;
};

export function ModulesTable({ rows }: { rows: ModuleRow[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pagination = useMemo(() => getPageItems(rows, page, pageSize), [page, pageSize, rows]);

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-surface-2 text-text-2">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Module</th>
              <th className="px-4 py-3 font-medium">Menus</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagination.items.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3 text-text">{row.label}</td>
                <td className="px-4 py-3 font-medium text-text">{row.name}</td>
                <td className="px-4 py-3 text-text-2">{row.menusCount}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-medium " +
                      (row.active ? "bg-secondary/15 text-secondary" : "bg-alert/15 text-alert")
                    }
                  >
                    {row.active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`Actions pour ${row.name}`}
                      className="inline-flex rounded-lg p-1.5 text-text-2 hover:bg-surface-2"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled>Modifier</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
            {pagination.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-2">
                  Aucun module.
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
    </div>
  );
}
