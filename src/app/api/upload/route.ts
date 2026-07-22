import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import { auth } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { can } from "@/lib/authz";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
      throw new ApiError(400, "BAD_REQUEST", "Aucun fichier n'a été fourni.");
    }

    const urls: string[] = [];

    // Ensure bucket exists (or fallback if already created)
    await supabase.storage.createBucket("parcelle-images", { public: true }).catch(() => {});

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("parcelle-images")
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (error) {
        throw new ApiError(500, "UPLOAD_ERROR", `Erreur d'upload: ${error.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from("parcelle-images")
        .getPublicUrl(fileName);

      urls.push(publicUrlData.publicUrl);
    }

    return NextResponse.json({ urls });
  } catch (err) {
    return toErrorResponse(err);
  }
}
