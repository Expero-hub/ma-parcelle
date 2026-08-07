import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  email: z.string().email("Email invalide."),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères."),
  firstName: z.string().min(1, "Prénom requis."),
  lastName: z.string().min(1, "Nom requis."),
  phone: z.string().optional(),
  address: z.string().optional(),
  birthDate: z.string().optional(),
  companyId: z.string().min(1, "Compagnie requise."),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Données d'inscription invalides.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // 1. Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findFirst({
      where: { email: data.email, deletedAt: null },
    });
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_ALREADY_EXISTS",
          message: "Cette adresse email est déjà enregistrée.",
        },
        { status: 400 }
      );
    }

    // 2. Récupérer le profil CLIENT
    const clientProfile = await prisma.profile.findFirst({
      where: { type: "CLIENT", active: true },
    });
    if (!clientProfile) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_CLIENT_PROFILE",
          message: "Le profil CLIENT est introuvable. Veuillez contacter un administrateur.",
        },
        { status: 500 }
      );
    }

    // 3. Vérifier que la compagnie existe
    const company = await prisma.company.findFirst({
      where: { id: data.companyId, active: true },
    });
    if (!company) {
      return NextResponse.json(
        {
          success: false,
          error: "COMPANY_NOT_FOUND",
          message: "La compagnie d'assurance sélectionnée est introuvable.",
        },
        { status: 400 }
      );
    }

    // 4. Créer l'utilisateur dans Better Auth (système bypass admin grâce à l'absence de headers)
    const created = await auth.api.createUser({
      body: {
        email: data.email,
        password: data.password,
        name: `${data.firstName} ${data.lastName}`.trim(),
        role: "user",
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          address: data.address,
          birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
          profileId: clientProfile.id,
          companyId: data.companyId,
          isValidated: false, // auto-validation optionnelle ou staff validation
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: created.user.id,
        email: created.user.email,
        name: created.user.name,
      },
      message: "Votre compte a été créé avec succès.",
    });
  } catch (err: any) {
    console.error("Erreur Inscription Client:", err);
    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: err.message || "Une erreur est survenue lors de l'inscription.",
      },
      { status: 500 }
    );
  }
}
