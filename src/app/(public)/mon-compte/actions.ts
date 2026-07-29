"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  newPassword?: string | null;
  confirmPassword?: string | null;
}

export async function updateProfile(data: UpdateProfileInput) {
  const sessionUser = await requireUser();
  const userId = sessionUser.id;

  const { firstName, lastName, email, phone, address, newPassword, confirmPassword } = data;

  if (!firstName.trim() || !lastName.trim()) {
    throw new Error("Le nom et le prénom sont requis.");
  }

  if (!email.trim() || !email.includes("@")) {
    throw new Error("Une adresse email valide est requise.");
  }

  // Check if email already used by someone else
  const existingUser = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (existingUser && existingUser.id !== userId) {
    throw new Error("Cette adresse email est déjà utilisée.");
  }

  // Update user in DB
  await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: `${firstName.trim()} ${lastName.trim()}`,
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      address: address?.trim() || null,
    },
  });

  // Handle password update if provided
  if (newPassword) {
    if (newPassword !== confirmPassword) {
      throw new Error("Les mots de passe ne correspondent pas.");
    }
    if (newPassword.length < 8) {
      throw new Error("Le nouveau mot de passe doit contenir au moins 8 caractères.");
    }

    const ctx = await auth.$context;
    const hashed = await ctx.password.hash(newPassword);

    await prisma.account.updateMany({
      where: {
        userId: userId,
        providerId: "credential",
      },
      data: {
        password: hashed,
      },
    });
  }

  revalidatePath("/mon-compte");
  return { success: true, message: "Profil mis à jour avec succès." };
}
