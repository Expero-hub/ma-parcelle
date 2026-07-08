import { Construction } from "lucide-react";

import { requirePermission } from "@/lib/authz";

export default async function ConstructionPage() {
  await requirePermission();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
      <Construction className="h-12 w-12 text-primary" />
      <h1 className="font-display text-2xl font-semibold text-text">Section en construction</h1>
      <p className="max-w-md text-sm text-text-2">
        Cette section fait partie de votre périmètre mais n'est pas encore disponible. Elle arrivera
        dans un prochain lot.
      </p>
    </div>
  );
}
