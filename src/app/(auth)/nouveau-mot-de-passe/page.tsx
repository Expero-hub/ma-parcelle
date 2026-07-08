"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { resetPassword } from "@/lib/auth-client";
import { newPasswordSchema, type NewPasswordInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function NouveauMotDePasseForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const isInvite = params.get("invite") === "1";
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordInput>({ resolver: zodResolver(newPasswordSchema) });

  if (!token) {
    return (
      <div>
        <h1 className="mb-2 font-display text-2xl font-semibold text-text">Lien invalide</h1>
        <p className="text-sm text-text-2">Ce lien est invalide ou a expiré. Demandez-en un nouveau.</p>
        <Link href="/mot-de-passe-oublie" className="mt-6 inline-block text-sm text-primary hover:underline">
          Renvoyer un lien
        </Link>
      </div>
    );
  }

  async function onSubmit(values: NewPasswordInput) {
    setFormError(null);
    const { error } = await resetPassword({ newPassword: values.password, token: token! });
    if (error) {
      setFormError("Le lien a expiré ou est invalide. Demandez-en un nouveau.");
      return;
    }
    router.push("/connexion");
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-text">
        {isInvite ? "Bienvenue" : "Nouveau mot de passe"}
      </h1>
      <p className="mb-6 text-sm text-text-2">
        {isInvite ? "Définissez votre mot de passe pour activer votre compte." : "Choisissez un nouveau mot de passe."}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-text">Mot de passe</label>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
          {errors.password && <p className="mt-1 text-xs text-alert">{errors.password.message}</p>}
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-text">Confirmer</label>
          <Input id="confirm" type="password" autoComplete="new-password" {...register("confirm")} />
          {errors.confirm && <p className="mt-1 text-xs text-alert">{errors.confirm.message}</p>}
        </div>

        {formError && <p className="text-sm text-alert">{formError}</p>}

        <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? "Validation…" : "Valider"}
        </Button>
      </form>
    </div>
  );
}

export default function NouveauMotDePassePage() {
  return (
    <Suspense fallback={null}>
      <NouveauMotDePasseForm />
    </Suspense>
  );
}
