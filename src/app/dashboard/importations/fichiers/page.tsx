import { requirePermission } from "@/lib/authz";
import { ImportationsClient } from "./importations-client";

export default async function ImportationsFichiersPage() {
  await requirePermission("create");

  return <ImportationsClient />;
}
