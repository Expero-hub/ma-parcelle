"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { useRouter } from "@/hooks/use-router";
import { http, type NormalizedError } from "@/lib/http";
import { createUserSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Opt = { id: string; name: string };
// Type d'ENTRÉE du schéma (agencyIds/pointOfSaleIds optionnels avant `.default([])`),
// ce qu'attend react-hook-form + zodResolver.
type FormValues = z.input<typeof createUserSchema>;

export function CreateUserForm({
  profiles,
  agencies,
  pointsOfSale,
}: {
  profiles: Opt[];
  agencies: Opt[];
  pointsOfSale: Opt[];
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { agencyIds: [], pointOfSaleIds: [] },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      await http.post("/users", values);
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
          <label className={field} htmlFor="firstName">Prénom</label>
          <Input id="firstName" {...register("firstName")} />
          {errors.firstName && <p className={errCls}>{errors.firstName.message}</p>}
        </div>
        <div>
          <label className={field} htmlFor="lastName">Nom</label>
          <Input id="lastName" {...register("lastName")} />
          {errors.lastName && <p className={errCls}>{errors.lastName.message}</p>}
        </div>
      </div>

      <div>
        <label className={field} htmlFor="email">Email</label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className={errCls}>{errors.email.message}</p>}
      </div>

      <div>
        <label className={field} htmlFor="phone">Téléphone</label>
        <Input id="phone" {...register("phone")} />
      </div>

      <div>
        <label className={field} htmlFor="profileId">Profil</label>
        <select
          id="profileId"
          {...register("profileId")}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
        >
          <option value="">Sélectionner…</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {errors.profileId && <p className={errCls}>{errors.profileId.message}</p>}
      </div>

      <fieldset>
        <legend className={field}>Agences</legend>
        <div className="flex flex-col gap-1">
          {agencies.length === 0 && <p className="text-sm text-text-2">Aucune agence disponible.</p>}
          {agencies.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" value={a.id} {...register("agencyIds")} /> {a.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={field}>Points de vente</legend>
        <div className="flex flex-col gap-1">
          {pointsOfSale.length === 0 && (
            <p className="text-sm text-text-2">Aucun point de vente disponible.</p>
          )}
          {pointsOfSale.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" value={p.id} {...register("pointOfSaleIds")} /> {p.name}
            </label>
          ))}
        </div>
      </fieldset>

      {formError && <p className="text-sm text-alert">{formError}</p>}

      <div className="mt-2 flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Création…" : "Créer et inviter"}
        </Button>
      </div>
    </form>
  );
}
