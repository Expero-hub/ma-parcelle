import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/authz";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ApiError(500, "MISSING_ENV", "Configuration Supabase manquante.");
  return createClient(url, key);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await can("/dashboard/importations/fichiers", "delete"))) {
      throw new ApiError(403, "FORBIDDEN", "Droit insuffisant pour supprimer ce fichier.");
    }

    const { id } = await ctx.params;

    const importFile = await prisma.importFile.findUnique({
      where: { id },
    });

    if (!importFile) {
      throw new ApiError(404, "NOT_FOUND", "Fichier introuvable.");
    }

    // Supprimer le fichier physique du stockage Supabase (bucket documents)
    const supabase = getSupabaseClient();
    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([importFile.path]);

    if (storageError) {
      console.error("Erreur de suppression dans le stockage Supabase:", storageError);
    }

    // Supprimer l'enregistrement de la base de données
    await prisma.importFile.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Fichier supprimé avec succès." });
  } catch (err) {
    return toErrorResponse(err);
  }
}
