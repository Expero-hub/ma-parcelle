"use client";

import { useEffect, useState } from "react";

import type { SidebarModule } from "@/lib/dashboard-nav";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export function DashboardShell({
  tree,
  userName,
  children,
}: {
  tree: SidebarModule[];
  userName: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("dash:collapsed") === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("dash:collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar
        tree={tree}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={userName}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
