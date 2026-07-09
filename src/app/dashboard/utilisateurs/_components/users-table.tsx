"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { http } from "@/lib/http";
import { Input } from "@/components/ui/input";

type Row = {
  id: string;
  name: string;
  email: string;
  profile: string;
  scopes: string[];
  active: boolean;
};

export function UsersTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [profile, setProfile] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const profiles = useMemo(() => Array.from(new Set(rows.map((r) => r.profile))), [rows]);
  const filtered = rows.filter(
    (r) =>
      (!q ||
        r.name.toLowerCase().includes(q.toLowerCase()) ||
        r.email.toLowerCase().includes(q.toLowerCase())) &&
      (!profile || r.profile === profile),
  );

  async function toggle(id: string, active: boolean) {
    setBusy(id);
    try {
      await http.patch(`/users/${id}`, { active: !active });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Rechercher nom ou email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
        >
          <option value="">Tous les profils</option>
          {profiles.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-text-2">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Profil</th>
              <th className="px-4 py-3 font-medium">Périmètre</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3 text-text">{r.name}</td>
                <td className="px-4 py-3 text-text-2">{r.email}</td>
                <td className="px-4 py-3 text-text-2">{r.profile}</td>
                <td className="px-4 py-3 text-text-2">{r.scopes.join(", ") || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-medium " +
                      (r.active ? "bg-secondary/15 text-secondary" : "bg-alert/15 text-alert")
                    }
                  >
                    {r.active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => toggle(r.id, r.active)}
                    className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {r.active ? "Désactiver" : "Activer"}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-2">Aucun utilisateur.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
