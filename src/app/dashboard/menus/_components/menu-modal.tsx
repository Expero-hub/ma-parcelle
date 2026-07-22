"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";

import { MenuIcon } from "@/components/dashboard/menu-icon";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
              <MenuModuleCombobox id="menu-module" defaultValue={currentModuleId} options={modules} />
            </div>

            <div className="space-y-2">
              <label htmlFor="menu-parent" className="block text-sm font-semibold text-text">
                Parent
              </label>
              <MenuParentCombobox id="menu-parent" defaultValue={menu?.parentId ?? ""} options={parentOptions} />
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
              <MenuIconCombobox id="menu-icon" defaultValue={menu?.icon ?? ""} options={ICON_OPTIONS} />
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

function MenuModuleCombobox({
  id,
  defaultValue,
  options,
}: {
  id: string;
  defaultValue: string;
  options: ModuleOption[];
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const selectedOption = options.find((option) => option.id === value);

  return (
    <ComboboxRoot onClose={() => setOpen(false)}>
      <ComboboxButton id={id} open={open} onClick={() => setOpen((current) => !current)}>
        {selectedOption ? selectedOption.name : "Selectionnez un module"}
      </ComboboxButton>
      {open && (
        <CommandPanel id={`${id}-listbox`}>
          <CommandInput placeholder="Rechercher un module..." />
          <CommandList className="max-h-48">
            <CommandEmpty>Aucun module trouve.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => {
                    setValue(option.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4", value === option.id ? "opacity-100" : "opacity-0")} />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandPanel>
      )}
      <input type="hidden" name="moduleId" value={value} required />
    </ComboboxRoot>
  );
}

function MenuParentCombobox({
  id,
  defaultValue,
  options,
}: {
  id: string;
  defaultValue: string;
  options: MenuOption[];
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const selectedOption = options.find((option) => option.id === value);

  return (
    <ComboboxRoot onClose={() => setOpen(false)}>
      <ComboboxButton id={id} open={open} onClick={() => setOpen((current) => !current)}>
        {selectedOption ? selectedOption.name : "Aucun parent"}
      </ComboboxButton>
      {open && (
        <CommandPanel id={`${id}-listbox`}>
          <CommandInput placeholder="Rechercher un menu..." />
          <CommandList className="max-h-56">
            <CommandEmpty>Aucun menu trouve.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Aucun parent"
                onSelect={() => {
                  setValue("");
                  setOpen(false);
                }}
              >
                <Check className={cn("h-4 w-4", value === "" ? "opacity-100" : "opacity-0")} />
                Aucun parent
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => {
                    setValue(option.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4", value === option.id ? "opacity-100" : "opacity-0")} />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandPanel>
      )}
      <input type="hidden" name="parentId" value={value} />
    </ComboboxRoot>
  );
}

function MenuIconCombobox({
  id,
  defaultValue,
  options,
}: {
  id: string;
  defaultValue: string;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);

  return (
    <ComboboxRoot onClose={() => setOpen(false)}>
      <ComboboxButton id={id} open={open} onClick={() => setOpen((current) => !current)}>
        <span className="flex min-w-0 items-center gap-2">
          {value && <MenuIcon name={value} className="h-4 w-4 shrink-0 text-text-2" />}
          <span className="truncate">{value || "Selectionnez une icone"}</span>
        </span>
      </ComboboxButton>
      {open && (
        <CommandPanel id={`${id}-listbox`}>
          <CommandInput placeholder="Rechercher une icone..." />
          <CommandList className="max-h-48">
            <CommandEmpty>Aucune icone trouvee.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Aucune icone"
                onSelect={() => {
                  setValue("");
                  setOpen(false);
                }}
              >
                <Check className={cn("h-4 w-4", value === "" ? "opacity-100" : "opacity-0")} />
                Aucune icone
              </CommandItem>
              {options.map((icon) => (
                <CommandItem
                  key={icon}
                  value={icon}
                  onSelect={() => {
                    setValue(icon);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4", value === icon ? "opacity-100" : "opacity-0")} />
                  <MenuIcon name={icon} className="h-4 w-4 text-text-2" />
                  {icon}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandPanel>
      )}
      <input type="hidden" name="icon" value={value} />
    </ComboboxRoot>
  );
}

function ComboboxRoot({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="relative"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) onClose();
      }}
    >
      {children}
    </div>
  );
}

function ComboboxButton({
  id,
  open,
  onClick,
  children,
}: {
  id: string;
  open: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      type="button"
      role="combobox"
      aria-controls={`${id}-listbox`}
      aria-expanded={open ? "true" : "false"}
      onClick={onClick}
      className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-left text-sm font-normal text-text outline-none transition-colors hover:bg-surface-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="min-w-0 truncate">{children}</span>
      <ChevronsUpDown className="h-4 w-4 shrink-0 text-text-2" />
    </button>
  );
}

function CommandPanel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div
      id={id}
      className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-[1700] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-[var(--shadow-hover)]"
    >
      <Command>{children}</Command>
    </div>
  );
}
