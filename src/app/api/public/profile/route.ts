import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Authentification requise." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, error: "INVALID_BODY", message: "Corps de requête manquant." },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, phone, address, birthDate, newPassword, confirmPassword } = body;

    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", message: "Le nom et le prénom sont requis." },
        { status: 400 }
      );
    }

    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", message: "Une adresse email valide est requise." },
        { status: 400 }
      );
    }

    // Check if email already used by someone else
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existingUser && existingUser.id !== userId) {
      return NextResponse.json(
        { success: false, error: "EMAIL_TAKEN", message: "Cette adresse email est déjà utilisée." },
        { status: 400 }
      );
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
        birthDate: birthDate ? new Date(birthDate) : null,
      },
    });

    // Handle password update if provided
    if (newPassword) {
      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { success: false, error: "PASSWORD_MISMATCH", message: "Les mots de passe ne correspondent pas." },
          { status: 400 }
        );
      }
      if (newPassword.length < 8) {
        return NextResponse.json(
          { success: false, error: "PASSWORD_TOO_SHORT", message: "Le nouveau mot de passe doit contenir au moins 8 caractères." },
          { status: 400 }
        );
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

    return NextResponse.json({ success: true, message: "Profil mis à jour avec succès." });
  } catch (err: any) {
    console.error("Erreur API updateProfile:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: "Une erreur interne s'est produite lors de la mise à jour." },
      { status: 500 }
    );
  }
}
