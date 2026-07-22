"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { useRouter } from "@/hooks/use-router";
import { http, type NormalizedError } from "@/lib/http";
import { createUserSchema } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type ProfileOption = { id: string; name: string; type: "ADMIN" | "CLIENT" | "STAFF" };
type Opt = { id: string; name: string };
type FormValues = z.input<typeof createUserSchema>;

export function CreateUserForm({
  profiles,
  agencies,
  companies,
}: {
  profiles: ProfileOption[];
  agencies: Opt[];
  companies: Opt[];
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { agencyIds: [], pointOfSaleIds: [] },
  });

  const profileId = watch("profileId");
  const companyId = watch("companyId");
  const agencyIds = watch("agencyIds") ?? [];
  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === profileId),
    [profileId, profiles],
  );

  function resetAssignments() {
    setValue("companyId", undefined, { shouldValidate: true });
    setValue("agencyIds", [], { shouldValidate: true });
    setValue("pointOfSaleIds", [], { shouldValidate: true });
  }

  async function onSubmit(values: FormValues) {
    setFormError(null);

    if (selectedProfile?.type === "CLIENT" && !values.companyId) {
      setFormError("Selectionnez une compagnie pour ce client.");
      return;
    }
    if (selectedProfile?.type === "STAFF" && (values.agencyIds ?? []).length === 0) {
      setFormError("Selectionnez au moins une agence pour ce profil staff.");
      return;
    }

    try {
      await http.post("/users", {
        ...values,
        companyId: selectedProfile?.type === "CLIENT" ? values.companyId : undefined,
        agencyIds: selectedProfile?.type === "STAFF" ? values.agencyIds ?? [] : [],
        pointOfSaleIds: [],
      });
      router.push("/dashboard/utilisateurs");
      router.refresh();
    } catch (e) {
      const err = e as NormalizedError;
      setFormError(err.message);
    }
  }

  const field = "mb-1 block text-sm font-medium text-text";
  const errCls = "mt-1 text-xs text-alert";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={field} htmlFor="firstName">
            Prenom
          </label>
          <Input id="firstName" {...register("firstName")} />
          {errors.firstName && <p className={errCls}>{errors.firstName.message}</p>}
        </div>
        <div>
          <label className={field} htmlFor="lastName">
            Nom
          </label>
          <Input id="lastName" {...register("lastName")} />
          {errors.lastName && <p className={errCls}>{errors.lastName.message}</p>}
        </div>
      </div>

      <div>
        <label className={field} htmlFor="email">
          Email
        </label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className={errCls}>{errors.email.message}</p>}
      </div>

      <div>
        <label className={field} htmlFor="phone">
          Telephone
        </label>
        <Input id="phone" {...register("phone")} />
      </div>

      <div>
        <label className={field} htmlFor="profileId">
          Profil
        </label>
        <select
          id="profileId"
          {...register("profileId", {
            onChange: resetAssignments,
          })}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
        >
          <option value="">Selectionner...</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
        {errors.profileId && <p className={errCls}>{errors.profileId.message}</p>}
      </div>

      {selectedProfile?.type === "CLIENT" && (
        <div>
          <label className={field}>Compagnie associée</label>
          <SingleCombobox
            value={companyId ?? ""}
            options={companies}
            emptyLabel="Aucune compagnie disponible."
            placeholder="Selectionner une compagnie..."
            searchPlaceholder="Rechercher une compagnie..."
            onChange={(value) => setValue("companyId", value || undefined, { shouldValidate: true })}
          />
        </div>
      )}

      {selectedProfile?.type === "STAFF" && (
        <div>
          <label className={field}>Agences rattachées</label>
          <MultiCombobox
            values={agencyIds}
            options={agencies}
            emptyLabel="Aucune agence disponible."
            placeholder="Selectionner des agences..."
            searchPlaceholder="Rechercher une agence..."
            onChange={(values) => setValue("agencyIds", values, { shouldValidate: true })}
          />
        </div>
      )}

  
      {formError && <p className="text-sm text-alert">{formError}</p>}

      <div className="mt-2 flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creation..." : "Créer et inviter"}
        </Button>
      </div>
    </form>
  );
}

function SingleCombobox({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  onChange,
}: {
  value: string;
  options: Opt[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.id === value);

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        role="combobox"
        aria-expanded="false"
        className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-surface px-3 text-left text-sm text-text"
      >
        <span className="truncate">{selected?.name ?? placeholder}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-text-2" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-72 p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-56">
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option.id} value={option.name} onSelect={() => onChange(option.id)}>
                  <Check className={cn("h-4 w-4", value === option.id ? "opacity-100" : "opacity-0")} />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function MultiCombobox({
  values,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  onChange,
}: {
  values: string[];
  options: Opt[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  onChange: (values: string[]) => void;
}) {
  const selected = options.filter((option) => values.includes(option.id));
  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0].name
        : `${selected.length} agences selectionnees`;

  function toggle(id: string) {
    onChange(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  }

  return (
    <div className="space-y-2">
      <Popover>
        <PopoverTrigger
          type="button"
          role="combobox"
          aria-expanded="false"
          className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-surface px-3 text-left text-sm text-text"
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-text-2" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) min-w-72 p-0">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList className="max-h-56">
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => toggle(option.id)}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        values.includes(option.id) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {option.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-1 text-xs text-text"
            >
              {option.name}
              <button
                type="button"
                onClick={() => toggle(option.id)}
                className="rounded-full p-0.5 text-text-2 hover:bg-surface hover:text-text"
                aria-label={`Retirer ${option.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
