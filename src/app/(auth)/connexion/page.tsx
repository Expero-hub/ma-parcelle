"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { signIn, authClient } from "@/lib/auth-client";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ConnexionPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    const { error } = await signIn.email({ email: values.email, password: values.password });
    if (error) {
      setFormError("Email ou mot de passe incorrect.");
      return;
    }
    const session = await authClient.getSession();
    const role = session.data?.user.role;
    router.push(role === "admin" || role === "staff" ? "/dashboard" : "/mon-espace");
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-text">Connexion</h1>
      <p className="mb-6 text-sm text-text-2">Accédez à votre espace Ma Parcelle.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-text">Email</label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && <p className="mt-1 text-xs text-alert">{errors.email.message}</p>}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-text">Mot de passe</label>
            <Link href="/mot-de-passe-oublie" className="text-xs text-primary hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
          {errors.password && <p className="mt-1 text-xs text-alert">{errors.password.message}</p>}
        </div>

        {formError && <p className="text-sm text-alert">{formError}</p>}

        <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
    </div>
  );
}
