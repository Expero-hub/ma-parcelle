import { prisma } from "@/lib/prisma";
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
        },
      }),
      prisma.zone.findMany({
        where: { deletedAt: null, active: true },
        select: { commune: true },
        orderBy: { commune: "asc" },
      }),
    ]);
      latestParcelles = dbParcelles.map((p) => ({
      ...p,
      price: Number(p.price),
    }));

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

