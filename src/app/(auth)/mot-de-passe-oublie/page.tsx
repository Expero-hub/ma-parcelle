"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { requestPasswordReset } from "@/lib/auth-client";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MotDePasseOubliePage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordInput) {
    await requestPasswordReset({ email: values.email, redirectTo: "/nouveau-mot-de-passe" });
    // Toujours afficher le succès (ne pas révéler si l'email existe).
    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <h1 className="mb-2 font-display text-2xl font-semibold text-text">Email envoyé</h1>
        <p className="text-sm text-text-2">
          Si un compte existe pour cette adresse, un lien de définition du mot de passe vient d'être envoyé.
        </p>
        <Link href="/connexion" className="mt-6 inline-block text-sm text-primary hover:underline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-text">Mot de passe oublié</h1>
      <p className="mb-6 text-sm text-text-2">Saisissez votre email pour recevoir un lien.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-text">Email</label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && <p className="mt-1 text-xs text-alert">{errors.email.message}</p>}
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? "Envoi…" : "Envoyer le lien"}
        </Button>
        <Link href="/connexion" className="text-center text-sm text-primary hover:underline">
          Retour à la connexion
        </Link>
      </form>
    </div>
  );
}
