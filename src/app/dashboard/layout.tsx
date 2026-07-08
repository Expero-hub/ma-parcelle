import { requireRole } from "@/lib/authz";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["admin", "staff"]);
  return <>{children}</>;
}
