import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
 
import { auth } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { can } from "@/lib/authz";
 
const PARCELLE_BUCKET = process.env.SUPABASE_BUCKET_PARCELLES ?? "parcelle-images";
 
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
 
  if (!url || !key) {
    // Erreur explicite au moment de la requete, plutot qu'un crash silencieux
    // au chargement du module (qui casse le build Next.js entier).
    throw new ApiError(
      500,
      "MISSING_ENV",
      "Configuration Supabase manquante (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
 
  return createClient(url, key);
}
 
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
    if (!(await can("/dashboard/parcelles", "create"))) {
      throw new ApiError(403, "FORBIDDEN", "Droit insuffisant pour uploader des images.");
    }
 
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    if (files.length === 0) {
      throw new ApiError(400, "BAD_REQUEST", "Aucun fichier n'a ete fourni.");
    }
 
    const supabase = getSupabaseClient();
    const urls: string[] = [];
 
    // Ensure bucket exists (ou fallback si deja cree)
    await supabase.storage.createBucket(PARCELLE_BUCKET, { public: true }).catch(() => {});
 
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
 
      const { error } = await supabase.storage
        .from(PARCELLE_BUCKET)
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: true,
        });
 
      if (error) {
        throw new ApiError(500, "UPLOAD_ERROR", `Erreur d'upload: ${error.message}`);
      }
 
      const { data: publicUrlData } = supabase.storage
        .from(PARCELLE_BUCKET)
        .getPublicUrl(fileName);
 
      urls.push(publicUrlData.publicUrl);
    }
 
    return NextResponse.json({ urls });
  } catch (err) {
    return toErrorResponse(err);
  }
}
 