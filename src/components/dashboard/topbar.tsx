"use client";

import Link from "next/link";
import { Menu, PanelLeftClose, PanelLeft, Home } from "lucide-react";

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
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/"
          aria-label="Retour à l'accueil"
          className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-text-2 hover:bg-surface-2 hover:text-text"
        >
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">Accueil</span>
        </Link>
        <ModeToggle />
        <UserMenu name={userName} />
      </div>
    </header>
  );
}
