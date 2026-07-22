"use client";

import { useState, useSyncExternalStore } from "react";

import type { SidebarModule } from "@/lib/dashboard-nav";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

const COLLAPSED_KEY = "dash:collapsed";
const COLLAPSED_EVENT = "dash:collapsed-change";

function getCollapsedSnapshot(): boolean {
  return localStorage.getItem(COLLAPSED_KEY) === "1";
}

function subscribeCollapsed(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(COLLAPSED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(COLLAPSED_EVENT, callback);
  };
}

function setCollapsedPreference(collapsed: boolean): void {
  localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  window.dispatchEvent(new Event(COLLAPSED_EVENT));
}

export function DashboardShell({
  tree,
  userName,
  children,
}: {
  tree: SidebarModule[];
  userName: string;
  children: React.ReactNode;
}) {
  const collapsed = useSyncExternalStore(subscribeCollapsed, getCollapsedSnapshot, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-bg">
      <Sidebar
        tree={tree}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div
        className={
          "flex h-full min-w-0 flex-col pt-16 transition-all " +
          (collapsed ? "md:pl-16" : "md:pl-64")
        }
      >
        <Topbar
          userName={userName}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsedPreference(!collapsed)}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
