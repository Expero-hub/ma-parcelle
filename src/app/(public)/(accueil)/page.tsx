import { prisma } from "@/lib/prisma";
import { SiteFooter } from "@/components/shared/site-footer";
import { Hero } from "./_components/hero";
import { KeyStats } from "./_components/key-stats";
import { ProcessSteps } from "./_components/process-steps";
import { FeaturedParcelles } from "./_components/featured-parcelles";
import { WhyUs } from "./_components/why-us";
import { Testimonials } from "./_components/testimonials";
import { FinalCta } from "./_components/final-cta";

export default async function Home() {
  let latestParcelles: any[] = [];
  try {
    latestParcelles = await prisma.parcelle.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        zone: true,
        images: { orderBy: { order: "asc" } },
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des parcelles récentes:", error);
  }

  return (
    <>
      <main className="flex-1">
        <Hero />
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

