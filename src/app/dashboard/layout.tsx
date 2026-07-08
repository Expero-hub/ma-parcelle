import { requireRole } from "@/lib/authz";
import { getSidebarTree } from "@/lib/dashboard-nav";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin", "staff"]);
  const tree = await getSidebarTree();
  return (
    <DashboardShell tree={tree} userName={user.name}>
      {children}
    </DashboardShell>
  );
}
