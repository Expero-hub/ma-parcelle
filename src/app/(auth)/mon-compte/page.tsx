import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Calendar } from "lucide-react";

import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function MonComptePage() {
  const sessionUser = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      profile: true,
    },
  });

  if (!user) {
    notFound();
  }

  const roleLabels: Record<string, string> = {
    admin: "Administrateur",
    staff: "Staff",
    user: "Client",
  };

  const role = user.role ?? "user";
  const label = roleLabels[role] || "Utilisateur";
  const initials = user.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const isStaffOrAdmin = role === "admin" || role === "staff";
  const backHref = isStaffOrAdmin ? "/dashboard" : "/mon-espace";

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        {/* Avatar with gradient */}
        <div className="relative mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary/60 text-2xl font-bold text-on-primary shadow-md">
          {initials}
        </div>
        <h1 className="font-display text-xl font-bold text-text">{user.name}</h1>
        <span
          className={
            "mt-1.5 rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wider " +
            (role === "admin"
              ? "bg-alert/15 text-alert"
              : role === "staff"
                ? "bg-secondary/15 text-secondary"
                : "bg-gold/15 text-gold-2")
          }
        >
          {label}
        </span>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        {/* Email */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-text-2">
            <Mail className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-text-2 block font-medium">Adresse email</span>
            <span className="text-text font-semibold truncate block">{user.email}</span>
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-text-2">
            <Phone className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-text-2 block font-medium">Téléphone</span>
            <span className="text-text font-semibold block">{user.phone ?? "—"}</span>
          </div>
        </div>

        {/* Created At */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-text-2">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-text-2 block font-medium">Membre depuis</span>
            <span className="text-text font-semibold block">
              {new Date(user.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <Link
          href={backHref}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-on-primary hover:bg-primary/95 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à mon espace
        </Link>
      </div>
    </div>
  );
}
