import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: companies });
  } catch (err) {
    console.error("Erreur récupération compagnies:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: "Impossible de charger les compagnies d'assurance." },
      { status: 500 }
    );
  }
}
