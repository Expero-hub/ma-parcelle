import type { Metadata } from "next";
import { Suspense } from "react";

import { prisma } from "@/lib/prisma";
import { PARCELLES, type Parcelle, type Statut } from "@/lib/parcelles";
import { ParcellesView } from "./_components/parcelles-view";
import { computeDisplayedPrice, calculateMonthlyPayment7Years } from "@/lib/simulation/simulation";

export const metadata: Metadata = {
  title: "Parcelles · Ma Parcelle",
  description:
    "Découvrez nos parcelles vérifiées au Bénin : filtrez par ville, statut et mode de paiement, et explorez le plan cadastral interactif.",
};

export default async function ParcellesPage() {
  let parcellesList: Parcelle[] = [];
  let zoneNames: string[] = [];

  try {
    const [dbParcelles, dbZones] = await Promise.all([
      prisma.parcelle.findMany({
        where: { deletedAt: null },
        include: {
          zone: true,
          images: { orderBy: { order: "asc" } },
          pointOfSale: {
            include: { agency: true },
          },
          reservations: {
            where: { status: "PENDING", deletedAt: null },
            select: { id: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.zone.findMany({
        where: { deletedAt: null, active: true },
        select: { commune: true, district: true, code: true, fullAddress: true },
        orderBy: { commune: "asc" },
      }),
    ]);

    // Extract unique zone names for combobox filtering
    const zoneSet = new Set<string>();
    dbZones.forEach((z) => {
      if (z.commune) zoneSet.add(z.commune);
    });
    zoneNames = Array.from(zoneSet);

    if (dbParcelles.length > 0) {
      parcellesList = dbParcelles.map((p) => {
        let statut: Statut = "disponible";
        if (p.status === "RESERVED") statut = "reserve";
        else if (p.status === "SOLD") statut = "vendu";

        const lat = p.zone?.latitude ? Number(p.zone.latitude) : 6.45;
        const lng = p.zone?.longitude ? Number(p.zone.longitude) : 2.35;

        const rawPrice = Number(p.price);
        const displayedPrice = computeDisplayedPrice({
          price: rawPrice,
          tauxSansRisque: p.tauxSansRisque !== null ? Number(p.tauxSansRisque) : null,
          volatilite: p.volatilite !== null ? Number(p.volatilite) : null,
          fraisMutation: p.fraisMutation !== null ? Number(p.fraisMutation) : null,
          tauxActuariel: p.tauxActuariel !== null ? Number(p.tauxActuariel) : null,
          fraisGestion: p.fraisGestion !== null ? Number(p.fraisGestion) : null,
          fraisAcquisition: p.fraisAcquisition !== null ? Number(p.fraisAcquisition) : null,
        });

        const monthlyPayment7Years = calculateMonthlyPayment7Years({
          price: rawPrice,
          tauxSansRisque: p.tauxSansRisque !== null ? Number(p.tauxSansRisque) : null,
          volatilite: p.volatilite !== null ? Number(p.volatilite) : null,
          fraisMutation: p.fraisMutation !== null ? Number(p.fraisMutation) : null,
          tauxActuariel: p.tauxActuariel !== null ? Number(p.tauxActuariel) : null,
          fraisGestion: p.fraisGestion !== null ? Number(p.fraisGestion) : null,
          fraisAcquisition: p.fraisAcquisition !== null ? Number(p.fraisAcquisition) : null,
        });

        return {
          ref: p.reference,
          ville: p.zone?.commune || p.zone?.department || "Bénin",
          quartier: p.zone?.district || p.zone?.fullAddress || "Autre quartier",
          surf: Number(p.area),
          price: displayedPrice,
          rawPrice: rawPrice,
          monthlyPayment7Years,
          pointOfSale: p.pointOfSale
            ? {
                id: p.pointOfSale.id,
                name: p.pointOfSale.name,
                phone: p.pointOfSale.phone,
                address: p.pointOfSale.address,
                agency: {
                  id: p.pointOfSale.agency.id,
                  name: p.pointOfSale.agency.name,
                  phone: p.pointOfSale.agency.phone,
                  address: p.pointOfSale.agency.address,
                },
              }
            : null,
          statut,
          verifie: p.titleVerified ?? true,
          paiement: "Échelonné",
          coord: `${lat.toFixed(4)}° N · ${lng.toFixed(4)}° E`,
          points: "70,70 232,64 246,250 78,262",
          cx: 156,
          cy: 162,
          plan: "55,50 150,44 158,150 60,158",
          desc: p.description || "Parcelle vérifiée disponible au catalogue.",
          images: p.images.map((img) => img.path),
          interestCount: p.reservations.length,
        };
      });
    }
  } catch (error) {
    console.error("Erreur chargement catalogue BDD:", error);
  }

  // Fallback if no database parcelles found
  if (parcellesList.length === 0) {
    parcellesList = PARCELLES.map((p) => ({
      ...p,
      rawPrice: p.price,
      price: computeDisplayedPrice({
        price: p.price,
        tauxSansRisque: p.tauxSansRisque,
        volatilite: p.volatilite,
        fraisMutation: p.fraisMutation,
        tauxActuariel: p.tauxActuariel,
        fraisGestion: p.fraisGestion,
        fraisAcquisition: p.fraisAcquisition,
      }),
      monthlyPayment7Years: calculateMonthlyPayment7Years({
        price: p.price,
        tauxSansRisque: p.tauxSansRisque,
        volatilite: p.volatilite,
        fraisMutation: p.fraisMutation,
        tauxActuariel: p.tauxActuariel,
        fraisGestion: p.fraisGestion,
        fraisAcquisition: p.fraisAcquisition,
      }),
    }));
  }
  if (zoneNames.length === 0) {
    zoneNames = Array.from(new Set(parcellesList.map((p) => p.ville)));
  }

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center font-mono text-xs text-text-2">Chargement…</div>}>
      <ParcellesView parcelles={parcellesList} zoneNames={zoneNames} />
    </Suspense>
  );
}

