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

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await can("/dashboard/importations/fichiers", "read"))) {
      throw new ApiError(403, "FORBIDDEN", "Droit insuffisant pour télécharger ce fichier.");
    }

    const { id } = await ctx.params;

    const importFile = await prisma.importFile.findUnique({
      where: { id },
    });

    if (!importFile) {
      throw new ApiError(404, "NOT_FOUND", "Fichier introuvable.");
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from("documents")
      .download(importFile.path);

    if (error || !data) {
      throw new ApiError(500, "DOWNLOAD_ERROR", `Erreur de téléchargement: ${error?.message || "Aucune donnée"}`);
    }

    const buffer = Buffer.from(await data.arrayBuffer());

    return new Response(buffer, {
      headers: {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(importFile.name)}"`,
        "Content-Type": data.type || "application/octet-stream",
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
