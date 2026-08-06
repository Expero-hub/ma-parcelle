import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export async function saveImportedFile({
  file,
  type,
  userId,
  processedRows,
  errorRows,
}: {
  file: Blob;
  type: string;
  userId: string;
  processedRows: number;
  errorRows: number;
}) {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.warn("Configuration Supabase manquante, saut de l'enregistrement de l'historique.");
      return null;
    }

    const supabase = createClient(url, key);
    const bucket = "documents";

    // Assurer que le bucket existe
    await supabase.storage.createBucket(bucket, { public: true }).catch(() => {});

    // Générer un nom de fichier unique
    const originalName = (file as any).name || "fichier-importe.xlsx";
    const fileExt = originalName.split(".").pop() || "xlsx";
    const fileName = `imports/${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (error) {
      console.error("Erreur d'upload vers Supabase Storage:", error.message);
      return null;
    }

    // Créer l'enregistrement d'historique en base de données
    const importFile = await prisma.importFile.create({
      data: {
        name: originalName,
        type: type, // "contrat" | "emission" | "encaissement"
        path: fileName,
        uploadedById: userId,
        processedRows,
        errorRows,
      },
    });

    return importFile;
  } catch (err) {
    console.error("Erreur lors de l'enregistrement de l'historique d'importation:", err);
    return null;
  }
}
