"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { useRouter } from "@/hooks/use-router";
import { useUserActions } from "@/hooks/use-user-actions";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  const { busyId, toggleActive, remove } = useUserActions();
  const [q, setQ] = useState("");
  const [profile, setProfile] = useState("");
  const [confirm, setConfirm] = useState<{ id: string; name: string; hard: boolean } | null>(null);

  const profiles = useMemo(() => Array.from(new Set(rows.map((r) => r.profile))), [rows]);
  const filtered = rows.filter(
    (r) =>
      (!q ||
        r.name.toLowerCase().includes(q.toLowerCase()) ||
        r.email.toLowerCase().includes(q.toLowerCase())) &&
      (!profile || r.profile === profile),
  );

  async function onConfirmDelete() {
    if (!confirm) return;
    await remove(confirm.id, confirm.hard);
    setConfirm(null);
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
              <th className="px-4 py-3 text-right font-medium">Actions</th>
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
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label="Actions"
                      disabled={busyId === r.id}
                      className="inline-flex rounded-lg p-1.5 text-text-2 hover:bg-surface-2 disabled:opacity-50"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/utilisateurs/${r.id}`)}>
                        Détail
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/utilisateurs/${r.id}/modifier`)}>
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActive(r.id, r.active)}>
                        {r.active ? "Désactiver" : "Activer"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setConfirm({ id: r.id, name: r.name, hard: false })}>
                        Supprimer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setConfirm({ id: r.id, name: r.name, hard: true })}
                        className="text-alert"
                      >
                        Supprimer définitivement
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.hard ? "Supprimer définitivement ?" : "Supprimer l'utilisateur ?"}
        description={
          confirm?.hard
            ? `${confirm?.name} sera supprimé définitivement. Cette action est irréversible.`
            : `${confirm?.name} sera désactivé et masqué des listes. Cette action est réversible.`
        }
        confirmLabel={confirm?.hard ? "Supprimer définitivement" : "Supprimer"}
        destructive={confirm?.hard}
        loading={busyId === confirm?.id}
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
