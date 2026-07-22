import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { PARCELLES, getParcelle, type Parcelle, type Statut } from "@/lib/parcelles";
import { CadastralPlan } from "./_components/cadastral-plan";
import { DetailHeader } from "./_components/detail-header";
import { DocumentsList } from "./_components/documents-list";
import { Gallery } from "./_components/gallery";
import { ReservationPanel } from "./_components/reservation-panel";
import { SpecGrid } from "./_components/spec-grid";
import { TrustNote } from "./_components/trust-note";

export async function generateStaticParams() {
  try {
    const dbParcelles = await prisma.parcelle.findMany({
      where: { deletedAt: null },
      select: { reference: true },
    });
    if (dbParcelles.length > 0) {
      return dbParcelles.map((p) => ({ ref: p.reference }));
    }
  } catch (error) {
    console.error("Erreur generateStaticParams:", error);
  }
  return PARCELLES.map((p) => ({ ref: p.ref }));
}

async function fetchParcelle(rawRef: string): Promise<(Parcelle & { imagesList?: string[] }) | undefined> {
  let decodedRef = rawRef;
  try {
    decodedRef = decodeURIComponent(rawRef);
  } catch {
    // ignore decode errors
  }

  try {
    const dbParcelle = await prisma.parcelle.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { reference: decodedRef },
          { reference: rawRef },
        ],
      },
      include: {
        zone: true,
        images: { orderBy: { order: "asc" } },
      },
    });

    if (dbParcelle) {
      let statut: Statut = "disponible";
      if (dbParcelle.status === "RESERVED") statut = "reserve";
      else if (dbParcelle.status === "SOLD") statut = "vendu";

      const lat = dbParcelle.zone?.latitude ? Number(dbParcelle.zone.latitude) : 6.45;
      const lng = dbParcelle.zone?.longitude ? Number(dbParcelle.zone.longitude) : 2.35;

      const imgPaths = dbParcelle.images.map((img) => img.path);

      return {
        ref: dbParcelle.reference,
        ville: dbParcelle.zone?.commune || dbParcelle.zone?.department || "Bénin",
        quartier: dbParcelle.zone?.district || dbParcelle.zone?.fullAddress || "Autre quartier",
        surf: Number(dbParcelle.area),
        price: Number(dbParcelle.price),
        statut,
        verifie: dbParcelle.titleVerified ?? true,
        paiement: "Échelonné",
        coord: `${lat.toFixed(4)}° N · ${lng.toFixed(4)}° E`,
        points: "70,70 232,64 246,250 78,262",
        cx: 156,
        cy: 162,
        plan: "55,50 150,44 158,150 60,158",
        desc: dbParcelle.description || "Parcelle vérifiée disponible au catalogue.",
        imagesList: imgPaths,
        minDuration: dbParcelle.minDuration ?? 1,
        maxDuration: dbParcelle.maxDuration ?? 5,
      };
    }
  } catch (error) {
    console.error("Erreur chargement parcelle BDD:", error);
  }

  return getParcelle(decodedRef) || getParcelle(rawRef);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ref: string }>;
}): Promise<Metadata> {
  const { ref } = await params;
  const p = await fetchParcelle(ref);
  if (!p) return { title: "Parcelle introuvable · Ma Parcelle" };
  return {
    title: `${p.ville} · ${p.quartier} (${p.ref}) · Ma Parcelle`,
    description: p.desc,
  };
}

export default async function ParcelleDetailPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const p = await fetchParcelle(ref);
  if (!p) notFound();

  return (
    <div className="mx-auto max-w-[1180px] animate-[fadeUp_.4s_ease_both] px-[clamp(16px,4vw,64px)] pt-[clamp(18px,3vw,28px)] pb-14">
      <DetailHeader p={p} />

      <div className="mt-6 grid grid-cols-1 items-start gap-9 lg:grid-cols-[1fr_360px]">
        {/* left */}
        <div className="flex min-w-0 flex-col gap-6">
          <Gallery images={p.imagesList} />
          <CadastralPlan p={p} />
          <SpecGrid p={p} />
          <DocumentsList p={p} />
        </div>

        {/* right */}
        <div>
          <ReservationPanel p={p} />
          <TrustNote />
        </div>
      </div>
    </div>
  );
}

