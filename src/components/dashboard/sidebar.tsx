"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { SidebarModule, MenuNode } from "@/lib/dashboard-nav";
import { MenuIcon } from "@/components/dashboard/menu-icon";
import { BrandLogo } from "@/components/shared/brand-logo";

function isActive(pathname: string, url: string | null): boolean {
  if (!url) return false;
  if (url === "/dashboard" || url === "/mon-espace") {
    return pathname === url;
  }
  return pathname === url || pathname.startsWith(url + "/");
}

function Item({ node, collapsed, pathname }: { node: MenuNode; collapsed: boolean; pathname: string }) {
  const active = isActive(pathname, node.url);
  const content = (
    <>
      <MenuIcon name={node.icon} className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{node.name}</span>}
    </>
  );
  const base =
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
    (active ? "bg-primary/10 text-primary" : "text-text-2 hover:bg-surface-2 hover:text-text");

  return (
    <li>
      {node.url ? (
        <Link href={node.url} className={base} title={collapsed ? node.name : undefined}>
          {content}
        </Link>
      ) : (
        <span className={base}>{content}</span>
      )}
      {!collapsed && node.children.length > 0 && (
        <ul className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">
          {node.children.map((c) => (
            <Item key={c.id} node={c} collapsed={false} pathname={pathname} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function Sidebar({
  tree,
  collapsed,
  mobileOpen,
  onCloseMobile,
}: {
  tree: SidebarModule[];
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onCloseMobile} aria-hidden />
      )}
      <aside
        className={
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-surface transition-all " +
          (mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full") +
          " md:translate-x-0" +
          (collapsed ? " w-16" : " w-64")
        }
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          {collapsed ? <MenuIcon name="gauge" className="h-6 w-6 text-primary" /> : <BrandLogo />}
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {tree.map((mod) => (
            <div key={mod.id} className="mb-5">
              {!collapsed && (
                <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-text-2 uppercase">
                  {mod.name}
                </p>
              )}
              <ul className="flex flex-col gap-1" onClick={onCloseMobile}>
                {mod.items.map((node) => (
                  <Item key={node.id} node={node} collapsed={collapsed} pathname={pathname} />
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
