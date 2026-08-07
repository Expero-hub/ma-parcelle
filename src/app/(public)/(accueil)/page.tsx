import { prisma } from "@/lib/prisma";
import { computeDisplayedPrice, calculateMonthlyPayment7Years } from "@/lib/simulation/simulation";
import { SiteFooter } from "@/components/shared/site-footer";
import { Hero } from "./_components/hero";
import { KeyStats } from "./_components/key-stats";
import { ProcessSteps } from "./_components/process-steps";
import { FeaturedParcelles } from "./_components/featured-parcelles";
import { WhyUs } from "./_components/why-us";
import { Testimonials } from "./_components/testimonials";
import { FinalCta } from "./_components/final-cta";
import { PARCELLES } from "@/lib/parcelles";

export default async function Home() {
  let latestParcelles: any[] = [];
  let zoneNames: string[] = [];
  try {
    const [dbParcelles, dbZones] = await Promise.all([
      prisma.parcelle.findMany({
        where: { deletedAt: null, status: "AVAILABLE" },
        orderBy: { createdAt: "desc" },
        take: 10,
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
      }),
      prisma.zone.findMany({
        where: { deletedAt: null, active: true },
        select: { commune: true },
        orderBy: { commune: "asc" },
      }),
    ]);

    latestParcelles = dbParcelles.map((p) => {
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
        id: p.id,
        reference: p.reference,
        status: p.status,
        area: Number(p.area),
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
        zone: p.zone
          ? {
              district: p.zone.district,
              commune: p.zone.commune,
              department: p.zone.department,
            }
          : null,
        images: p.images.map((img) => ({
          path: img.path,
        })),
        interestCount: p.reservations.length,
      };
    });

    const zoneSet = new Set<string>();
    dbZones.forEach((z) => {
      if (z.commune) zoneSet.add(z.commune);
    });
    zoneNames = Array.from(zoneSet);
  } catch (error) {
    console.error("Erreur lors de la récupération des données de l'accueil:", error);
  }

  if (zoneNames.length === 0) {
    zoneNames = Array.from(new Set(PARCELLES.map((p) => p.ville)));
  }

  return (
    <>
      <main className="flex-1">
        <Hero zoneNames={zoneNames} />
        <KeyStats />
        <ProcessSteps />
        <FeaturedParcelles parcelles={latestParcelles} />
        <WhyUs />
        <Testimonials />
        <FinalCta />
      </main>
      <SiteFooter variant="full" />
    </>
  );
}

