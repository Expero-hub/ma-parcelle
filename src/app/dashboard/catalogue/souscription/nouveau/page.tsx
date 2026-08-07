import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { computeDisplayedPrice } from "@/lib/simulation/simulation";
import { StaffSubscriptionWizard } from "./_components/staff-subscription-wizard";

export default async function StaffSouscriptionPage() {
  await requirePermission("create");

  // 1. Charger tous les clients actifs
  const clients = await prisma.user.findMany({
    where: {
      profile: { type: "CLIENT" },
      active: true,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      companyId: true,
    },
    orderBy: { name: "asc" },
  });

  // 2. Charger toutes les parcelles disponibles
  const dbParcelles = await prisma.parcelle.findMany({
    where: {
      status: "AVAILABLE",
      deletedAt: null,
    },
    include: { zone: true },
    orderBy: { reference: "asc" },
  });

  // 3. Charger le barème par défaut
  const defaultBaremeVal = await prisma.baremeTechniqueDefaut.findFirst({
    where: { isActive: true },
  });

  const bareme = defaultBaremeVal || {
    tauxSansRisque: 0.02,
    volatilite: 0.06,
    fraisMutation: 0.20,
    tauxActuariel: 0.035,
    fraisGestion: 0.05,
    fraisAcquisition: 0.03,
  };

  const parcelles = dbParcelles.map((p) => {
    const rawPrice = Number(p.price);
    const displayedPrice = computeDisplayedPrice({
      price: rawPrice,
      tauxSansRisque: p.tauxSansRisque !== null ? Number(p.tauxSansRisque) : Number(bareme.tauxSansRisque),
      volatilite: p.volatilite !== null ? Number(p.volatilite) : Number(bareme.volatilite),
      fraisMutation: p.fraisMutation !== null ? Number(p.fraisMutation) : Number(bareme.fraisMutation),
      tauxActuariel: p.tauxActuariel !== null ? Number(p.tauxActuariel) : Number(bareme.tauxActuariel),
      fraisGestion: p.fraisGestion !== null ? Number(p.fraisGestion) : Number(bareme.fraisGestion),
      fraisAcquisition: p.fraisAcquisition !== null ? Number(p.fraisAcquisition) : Number(bareme.fraisAcquisition),
    });

    return {
      id: p.id,
      ref: p.reference,
      rawPrice: rawPrice,
      price: displayedPrice,
      commune: p.zone?.commune || "Bénin",
      tauxSansRisque: p.tauxSansRisque !== null ? Number(p.tauxSansRisque) : Number(bareme.tauxSansRisque),
      volatilite: p.volatilite !== null ? Number(p.volatilite) : Number(bareme.volatilite),
      fraisMutation: p.fraisMutation !== null ? Number(p.fraisMutation) : Number(bareme.fraisMutation),
      tauxActuariel: p.tauxActuariel !== null ? Number(p.tauxActuariel) : Number(bareme.tauxActuariel),
      fraisGestion: p.fraisGestion !== null ? Number(p.fraisGestion) : Number(bareme.fraisGestion),
      fraisAcquisition: p.fraisAcquisition !== null ? Number(p.fraisAcquisition) : Number(bareme.fraisAcquisition),
    };
  });

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Nouvelle souscription (Staff)</h1>
        <p className="text-sm text-text-2 mt-1">
          Remplissez le dossier de souscription et l'intention d'achat pour le compte d'un client.
        </p>
      </div>

      <StaffSubscriptionWizard clients={clients} parcelles={parcelles} />
    </div>
  );
}
