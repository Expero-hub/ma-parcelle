"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MenuIcon } from "@/components/dashboard/menu-icon";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

export type ModuleOption = { id: string; name: string };
export type MenuOption = { id: string; name: string; moduleId: string };
export type EditableMenu = {
  id: string;
  name: string;
  moduleId: string;
  parentId: string | null;
  url: string | null;
  icon: string | null;
  order: number;
  active: boolean;
};

export type MenuFormValue = {
  name: string;
  moduleId: string;
  parentId: string | null;
  url: string | null;
  icon: string | null;
  order: number | undefined;
  active: boolean;
};

const ICON_OPTIONS = [
  "users",
  "shield",
  "layout-grid",
  "building-2",
  "store",
  "map-pin",
  "map",
  "land-plot",
  "bookmark",
  "file-text",
  "calendar-clock",
  "wallet",
  "gauge",
  "bar-chart-3",
  "trending-up",
  "receipt",
];

export function MenuModal({
  open,
  mode,
  menu,
  modules,
  menus,
  loading,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  menu?: EditableMenu | null;
  modules: ModuleOption[];
  menus: MenuOption[];
  loading?: boolean;
  error?: string | null;
  onSubmit: (value: MenuFormValue) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const title = mode === "create" ? "Ajouter un nouveau menu" : "Modifier le menu";
  const description =
    mode === "create"
      ? "Remplissez les informations du nouveau menu ci-dessous."
      : "Modifiez les informations du menu ci-dessous.";
  const currentModuleId = menu?.moduleId ?? modules[0]?.id ?? "";
  const parentOptions = menus.filter((option) => option.id !== menu?.id);

  return (
    <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/55" onClick={loading ? undefined : onClose} aria-label="Fermer" />
      <form
        key={`${mode}-${menu?.id ?? "new"}`}
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-hover)]"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const orderValue = String(form.get("order") ?? "").trim();
          onSubmit({
            name: String(form.get("name") ?? ""),
            moduleId: String(form.get("moduleId") ?? ""),
            parentId: String(form.get("parentId") ?? "") || null,
            url: String(form.get("url") ?? "") || null,
            icon: String(form.get("icon") ?? "") || null,
            order: orderValue ? Number(orderValue) : undefined,
            active: form.get("active") === "on",
          });
        }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-text-2 hover:bg-surface-2 hover:text-text disabled:opacity-50"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="font-display text-xl font-semibold text-text">{title}</h2>
        <p className="mt-2 max-w-sm text-sm text-text-2">{description}</p>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <label htmlFor="menu-name" className="block text-sm font-semibold text-text">
              Nom du menu
            </label>
            <Input
              id="menu-name"
              name="name"
              defaultValue={menu?.name ?? ""}
              required
              autoFocus
              placeholder="Entrez le nom du menu"
              className="h-11"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="menu-module" className="block text-sm font-semibold text-text">
                Module
              </label>
              <select
                id="menu-module"
                name="moduleId"
                defaultValue={currentModuleId}
                required
                className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-text outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="menu-parent" className="block text-sm font-semibold text-text">
                Parent
              </label>
              <select
                id="menu-parent"
                name="parentId"
                defaultValue={menu?.parentId ?? ""}
                className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-text outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Aucun parent</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="menu-url" className="block text-sm font-semibold text-text">
              URL
            </label>
            <Input
              id="menu-url"
              name="url"
              defaultValue={menu?.url ?? ""}
              placeholder="/dashboard/nom-du-menu"
              className="h-11"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="menu-icon" className="block text-sm font-semibold text-text">
                Icone
              </label>
              <select
                id="menu-icon"
                name="icon"
                defaultValue={menu?.icon ?? ""}
                className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-text outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Selectionnez une icone</option>
                {ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="menu-order" className="block text-sm font-semibold text-text">
                Ordre
              </label>
              <Input
                id="menu-order"
                name="order"
                type="number"
                min={0}
                defaultValue={menu?.order ?? ""}
                placeholder="Automatique"
                className="h-11"
              />
            </div>
          </div>

      

          <label className="flex items-center gap-3 text-sm font-medium text-text">
            <input
              name="active"
              type="checkbox"
              defaultChecked={menu?.active ?? true}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Menu actif
          </label>

          {error && <p className="rounded-lg bg-alert/10 px-3 py-2 text-sm text-alert">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "..." : mode === "create" ? "Ajouter" : "Modifier"}
          </Button>
        </div>
      </form>
    </div>
  );
}
