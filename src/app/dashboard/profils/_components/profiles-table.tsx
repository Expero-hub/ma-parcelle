"use client";

import { useMemo, useState } from "react";
import { Edit, Eye, MoreHorizontal, PlusCircle, ShieldCheck, Trash2 } from "lucide-react";

import { useRouter } from "@/hooks/use-router";
import { http, type NormalizedError } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileModal, type ProfileFormValue } from "./profile-modal";

type ProfileRow = {
  id: string;
  name: string;
  type: "ADMIN" | "CLIENT" | "STAFF";
  description: string | null;
  active: boolean;
  isSystem: boolean;
  usersCount: number;
  permissionsCount: number;
};

const typeLabels = {
  ADMIN: "Admin",
  CLIENT: "Client",
  STAFF: "Staff",
};

export function ProfilesTable({
  rows,
  canCreate,
  canUpdate,
  canDelete,
}: {
  rows: ProfileRow[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; profile?: ProfileRow } | null>(null);
  const [confirm, setConfirm] = useState<ProfileRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.name, typeLabels[row.type], row.description ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [q, rows]);

  async function submitProfile(value: ProfileFormValue) {
    setFormError(null);
    const editing = modal?.mode === "edit" ? modal.profile : null;
    setBusyId(editing?.id ?? "create");
    try {
      if (editing) await http.patch(`/profiles/${editing.id}`, value);
      else await http.post("/profiles", value);
      setModal(null);
      router.refresh();
    } catch (error) {
      const normalized = error as NormalizedError;
      setFormError(normalized.fieldErrors?.name ?? normalized.message);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteProfile() {
    if (!confirm) return;
    setBusyId(confirm.id);
    try {
      await http.delete(`/profiles/${confirm.id}`);
      setConfirm(null);
      router.refresh();
    } catch (error) {
      setFormError((error as NormalizedError).message);
      setConfirm(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-2" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Rechercher un profil..."
            className="h-10 pl-9"
          />
        </div>
        {canCreate && (
          <Button onClick={() => setModal({ mode: "create" })} className="h-10">
            <PlusCircle className="h-4 w-4" />
            Ajouter un profil
          </Button>
        )}
      </div>

      {formError && !modal && (
        <p className="mb-4 rounded-lg bg-alert/10 px-3 py-2 text-sm text-alert">{formError}</p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-surface-2 text-text-2">
            <tr>
              <th className="px-4 py-3 font-medium">Profil</th>
              <th className="px-4 py-3 font-medium">Categorie</th>
              <th className="px-4 py-3 font-medium">Utilisateurs</th>
              <th className="px-4 py-3 font-medium">Permissions</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium text-text">{row.name}</div>
                  {/* {row.description && <div className="mt-1 max-w-md text-xs text-text-2">{row.description}</div>} */}
                </td>
                <td className="px-4 py-3 text-text-2">
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium">
                    {typeLabels[row.type]}
                  </span>
                  {row.isSystem && <span className="ml-2 text-xs text-text-2">Systeme</span>}
                </td>
                <td className="px-4 py-3 text-text-2">{row.usersCount}</td>
                <td className="px-4 py-3 text-text-2">{row.permissionsCount}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-medium " +
                      (row.active ? "bg-secondary/15 text-secondary" : "bg-alert/15 text-alert")
                    }
                  >
                    {row.active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`Actions pour ${row.name}`}
                      disabled={busyId === row.id}
                      className="inline-flex rounded-lg p-1.5 text-text-2 hover:bg-surface-2 disabled:opacity-50"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      {canUpdate && (
                        <DropdownMenuItem onClick={() => setModal({ mode: "edit", profile: row })}>
                          <Edit className="h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/profils/${row.id}/permissions`)}>
                        <Eye className="h-4 w-4" />
                        Voir les permissions
                      </DropdownMenuItem>
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={row.isSystem || row.usersCount > 0}
                            onClick={() => setConfirm(row)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-2">
                  Aucun profil ne correspond a votre recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-text-2">{filtered.length} resultat(s) affiche(s)</p>

      <ProfileModal
        open={!!modal}
        mode={modal?.mode ?? "create"}
        initialValue={
          modal?.profile
            ? {
                name: modal.profile.name,
                description: modal.profile.description,
                active: modal.profile.active,
              }
            : undefined
        }
        loading={busyId === "create" || busyId === modal?.profile?.id}
        error={formError}
        onSubmit={submitProfile}
        onClose={() => {
          setModal(null);
          setFormError(null);
        }}
      />

      <ConfirmDialog
        open={!!confirm}
        title="Supprimer le profil ?"
        description={
          confirm
            ? `${confirm.name} sera masque des listes. Cette action est reservee aux profils staff non affectes.`
            : undefined
        }
        confirmLabel="Supprimer"
        destructive
        loading={busyId === confirm?.id}
        onConfirm={deleteProfile}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
