"use client";

import { Menu, PanelLeftClose, PanelLeft } from "lucide-react";

import { ModeToggle } from "@/components/shared/mode-toggle";
import { UserMenu } from "@/components/shared/user-menu";

export function Topbar({
  userName,
  collapsed,
  onToggleCollapse,
  onOpenMobile,
}: {
  userName: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Ouvrir le menu"
          className="rounded-lg p-2 text-text-2 hover:bg-surface-2 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
          className="hidden rounded-lg p-2 text-text-2 hover:bg-surface-2 md:inline-flex"
        >
          {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <ModeToggle />
        <UserMenu name={userName} />
      </div>
    </header>
  );
}
