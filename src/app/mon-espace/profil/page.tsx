import { getCurrentUser } from "@/lib/authz";

export default async function ProfilPage() {
  const user = await getCurrentUser();
  const rows: [string, string][] = [
    ["Nom", user?.name ?? "—"],
    ["Email", user?.email ?? "—"],
    ["Téléphone", (user as { phone?: string | null } | null)?.phone ?? "—"],
  ];
  return (
    <div className="p-6 md:p-8">
      <h1 className="mb-6 font-display text-2xl font-semibold text-text">Mon profil</h1>
      <dl className="max-w-md divide-y divide-border rounded-2xl border border-border bg-surface">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between px-5 py-4">
            <dt className="text-sm text-text-2">{k}</dt>
            <dd className="text-sm font-medium text-text">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
