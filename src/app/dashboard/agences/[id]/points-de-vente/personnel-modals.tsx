"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, X, UserMinus, UserPlus, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };

type MemberType = {
  id: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
};

export function AssignMemberModal({
  open,
  loading,
  error,
  agencyUsers,
  onSubmit,
  onClose,
}: {
  open: boolean;
  loading?: boolean;
  error?: string | null;
  agencyUsers: Opt[];
  onSubmit: (userId: string) => void;
  onClose: () => void;
}) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedUserId("");
      setPopoverOpen(false);
    }
  }, [open]);

  if (!open) return null;

  const selectedUser = agencyUsers.find((u) => u.id === selectedUserId);

  return (
    <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/55" onClick={loading ? undefined : onClose} aria-label="Fermer" />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-hover)]">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-text-2 hover:bg-surface-2 hover:text-text disabled:opacity-50"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="font-display text-xl font-semibold text-text flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Assigner du personnel
        </h2>
        <p className="mt-2 text-sm text-text-2">
          Sélectionnez un membre de l'agence pour l'affecter à ce point de vente.
        </p>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-text">Personnel disponible</label>
            
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger
                type="button"
                role="combobox"
                aria-expanded={popoverOpen}
                disabled={loading}
                className="flex h-11 w-full items-center justify-between rounded-lg border border-border bg-surface px-3 text-left text-sm text-text outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                <span className="truncate">{selectedUser?.name ?? "Sélectionner un membre..."}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-text-2" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-(--anchor-width) min-w-80 p-0 z-[2000]">
                <Command>
                  <CommandInput placeholder="Rechercher un membre..." />
                  <CommandList className="max-h-56">
                    <CommandEmpty>Aucun membre trouvé.</CommandEmpty>
                    <CommandGroup>
                      {agencyUsers.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={user.name}
                          onSelect={() => {
                            setSelectedUserId(user.id);
                            setPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              selectedUserId === user.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {user.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {error && <p className="rounded-lg bg-alert/10 px-3 py-2 text-sm text-alert">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={loading || !selectedUserId}
            onClick={() => onSubmit(selectedUserId)}
          >
            {loading ? "Assignation..." : "Assigner"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ViewMembersModal({
  open,
  posName,
  members,
  onDelete,
  deletingUserId,
  onClose,
}: {
  open: boolean;
  posName: string;
  members: MemberType[];
  onDelete: (userId: string) => void;
  deletingUserId: string | null;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/55" onClick={onClose} aria-label="Fermer" />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-hover)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-text-2 hover:bg-surface-2 hover:text-text"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="font-display text-xl font-semibold text-text">Personnel assigné</h2>
        <p className="mt-2 text-sm text-text-2">
          Membres affectés au point de vente <span className="font-semibold text-text">{posName}</span>.
        </p>

        <div className="mt-5 max-h-80 overflow-y-auto divide-y divide-border rounded-xl border border-border bg-surface-2/30">
          {members.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-2">Aucun personnel assigné à ce point de vente.</p>
          ) : (
            members.map((member) => {
              const u = member.user;
              const isUserDeleting = deletingUserId === u.id;
              const fullName = `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Sans nom";
              return (
                <div key={member.id} className="flex items-center justify-between p-3.5 transition-colors hover:bg-surface-2/40">
                  <div className="min-w-0 pr-4">
                    <p className="truncate text-sm font-medium text-text">{fullName}</p>
                    <p className="truncate text-xs text-text-2">{u.email}</p>
                  </div>
                  <button
                    type="button"
                    disabled={isUserDeleting}
                    onClick={() => onDelete(u.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-alert hover:bg-alert/10 disabled:opacity-50"
                    aria-label={`Retirer ${fullName}`}
                    title="Dissocier ce membre"
                  >
                    {isUserDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
