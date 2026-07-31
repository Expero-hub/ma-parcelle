import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { PARCELLES, getParcelle, type Parcelle, type Statut } from "@/lib/parcelles";
import { computeDisplayedPrice, calculateMonthlyPayment7Years } from "@/lib/simulation/simulation";
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
    const [dbParcelle, defaultBareme] = await Promise.all([
      prisma.parcelle.findFirst({
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
          pointOfSale: {
            include: { agency: true },
          },
        },
      }),
      prisma.baremeTechniqueDefaut.findFirst({
        where: { isActive: true },
        orderBy: { effectiveFrom: "desc" },
      }),
    ]);

    if (dbParcelle) {
      let statut: Statut = "disponible";
      if (dbParcelle.status === "RESERVED") statut = "reserve";
      else if (dbParcelle.status === "SOLD") statut = "vendu";

      const lat = dbParcelle.zone?.latitude ? Number(dbParcelle.zone.latitude) : 6.45;
      const lng = dbParcelle.zone?.longitude ? Number(dbParcelle.zone.longitude) : 2.35;

      const imgPaths = dbParcelle.images.map((img) => img.path);

      // Default values fallback
      const defaultBaremeVal = defaultBareme ? {
        tauxSansRisque: Number(defaultBareme.tauxSansRisque),
        volatilite: Number(defaultBareme.volatilite),
        fraisMutation: Number(defaultBareme.fraisMutation),
        tauxActuariel: Number(defaultBareme.tauxActuariel),
        fraisGestion: Number(defaultBareme.fraisGestion),
        fraisAcquisition: Number(defaultBareme.fraisAcquisition),
      } : {
        tauxSansRisque: 0.02,
        volatilite: 0.06,
        fraisMutation: 0.20,
        tauxActuariel: 0.035,
        fraisGestion: 0.05,
        fraisAcquisition: 0.03,
      };

      const rawPrice = Number(dbParcelle.price);
      const displayedPrice = computeDisplayedPrice({
        price: rawPrice,
        tauxSansRisque: dbParcelle.tauxSansRisque !== null ? Number(dbParcelle.tauxSansRisque) : defaultBaremeVal.tauxSansRisque,
        volatilite: dbParcelle.volatilite !== null ? Number(dbParcelle.volatilite) : defaultBaremeVal.volatilite,
        fraisMutation: dbParcelle.fraisMutation !== null ? Number(dbParcelle.fraisMutation) : defaultBaremeVal.fraisMutation,
        tauxActuariel: dbParcelle.tauxActuariel !== null ? Number(dbParcelle.tauxActuariel) : defaultBaremeVal.tauxActuariel,
        fraisGestion: dbParcelle.fraisGestion !== null ? Number(dbParcelle.fraisGestion) : defaultBaremeVal.fraisGestion,
        fraisAcquisition: dbParcelle.fraisAcquisition !== null ? Number(dbParcelle.fraisAcquisition) : defaultBaremeVal.fraisAcquisition,
      });

      const monthlyPayment7Years = calculateMonthlyPayment7Years({
        price: rawPrice,
        tauxSansRisque: dbParcelle.tauxSansRisque !== null ? Number(dbParcelle.tauxSansRisque) : defaultBaremeVal.tauxSansRisque,
        volatilite: dbParcelle.volatilite !== null ? Number(dbParcelle.volatilite) : defaultBaremeVal.volatilite,
        fraisMutation: dbParcelle.fraisMutation !== null ? Number(dbParcelle.fraisMutation) : defaultBaremeVal.fraisMutation,
        tauxActuariel: dbParcelle.tauxActuariel !== null ? Number(dbParcelle.tauxActuariel) : defaultBaremeVal.tauxActuariel,
        fraisGestion: dbParcelle.fraisGestion !== null ? Number(dbParcelle.fraisGestion) : defaultBaremeVal.fraisGestion,
        fraisAcquisition: dbParcelle.fraisAcquisition !== null ? Number(dbParcelle.fraisAcquisition) : defaultBaremeVal.fraisAcquisition,
      });

      return {
        ref: dbParcelle.reference,
        ville: dbParcelle.zone?.commune || dbParcelle.zone?.department || "Bénin",
        quartier: dbParcelle.zone?.district || dbParcelle.zone?.fullAddress || "Autre quartier",
        surf: Number(dbParcelle.area),
        price: displayedPrice,
        rawPrice: rawPrice,
        monthlyPayment7Years,
        pointOfSale: dbParcelle.pointOfSale
          ? {
              id: dbParcelle.pointOfSale.id,
              name: dbParcelle.pointOfSale.name,
              phone: dbParcelle.pointOfSale.phone,
              address: dbParcelle.pointOfSale.address,
              agency: {
                id: dbParcelle.pointOfSale.agency.id,
                name: dbParcelle.pointOfSale.agency.name,
                phone: dbParcelle.pointOfSale.agency.phone,
                address: dbParcelle.pointOfSale.agency.address,
              },
            }
          : null,
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
        maxDuration: dbParcelle.maxDuration ?? 7,
        tauxSansRisque: dbParcelle.tauxSansRisque !== null ? Number(dbParcelle.tauxSansRisque) : defaultBaremeVal.tauxSansRisque,
        volatilite: dbParcelle.volatilite !== null ? Number(dbParcelle.volatilite) : defaultBaremeVal.volatilite,
        fraisMutation: dbParcelle.fraisMutation !== null ? Number(dbParcelle.fraisMutation) : defaultBaremeVal.fraisMutation,
        tauxActuariel: dbParcelle.tauxActuariel !== null ? Number(dbParcelle.tauxActuariel) : defaultBaremeVal.tauxActuariel,
        fraisGestion: dbParcelle.fraisGestion !== null ? Number(dbParcelle.fraisGestion) : defaultBaremeVal.fraisGestion,
        fraisAcquisition: dbParcelle.fraisAcquisition !== null ? Number(dbParcelle.fraisAcquisition) : defaultBaremeVal.fraisAcquisition,
      };
    }
  } catch (error) {
    console.error("Erreur chargement parcelle BDD:", error);
  }

  const fallback = getParcelle(decodedRef) || getParcelle(rawRef);
  if (fallback) {
    return {
      ...fallback,
      rawPrice: fallback.price,
      price: computeDisplayedPrice({
        price: fallback.price,
        tauxSansRisque: fallback.tauxSansRisque,
        volatilite: fallback.volatilite,
        fraisMutation: fallback.fraisMutation,
        tauxActuariel: fallback.tauxActuariel,
        fraisGestion: fallback.fraisGestion,
        fraisAcquisition: fallback.fraisAcquisition,
      }),
      monthlyPayment7Years: calculateMonthlyPayment7Years({
        price: fallback.price,
        tauxSansRisque: fallback.tauxSansRisque,
        volatilite: fallback.volatilite,
        fraisMutation: fallback.fraisMutation,
        tauxActuariel: fallback.tauxActuariel,
        fraisGestion: fallback.fraisGestion,
        fraisAcquisition: fallback.fraisAcquisition,
      }),
      minDuration: fallback.minDuration ?? 1,
      maxDuration: fallback.maxDuration ?? 7,
    };
  }
  return undefined;
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
          
        </div>

        {/* right */}
        <div>
          <ReservationPanel p={p} />
          {/* <TrustNote /> */}
        </div>
      </div>
    </div>
  );
}

