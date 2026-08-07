import { notFound } from "next/navigation";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { computeDisplayedPrice } from "@/lib/simulation/simulation";
import { SubscriptionWizard } from "./_components/subscription-wizard";

type PageProps = {
  params: Promise<{ ref: string }>;
};

export default async function SouscriptionPage({ params }: PageProps) {
  const user = await requireUser();
  const { ref } = await params;
  let decodedRef = ref;
  try {
    decodedRef = decodeURIComponent(ref);
  } catch {
    // ignore decode errors
  }

  // 1. Charger la parcelle
  const dbParcelle = await prisma.parcelle.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { reference: decodedRef },
        { reference: ref },
      ],
    },
    include: { zone: true },
  });

  if (!dbParcelle) {
    notFound();
  }

  // 2. Charger le barème technique pour le calcul du prix affiché
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

  const rawPrice = Number(dbParcelle.price);
  const displayedPrice = computeDisplayedPrice({
    price: rawPrice,
    tauxSansRisque: dbParcelle.tauxSansRisque !== null ? Number(dbParcelle.tauxSansRisque) : Number(bareme.tauxSansRisque),
    volatilite: dbParcelle.volatilite !== null ? Number(dbParcelle.volatilite) : Number(bareme.volatilite),
    fraisMutation: dbParcelle.fraisMutation !== null ? Number(dbParcelle.fraisMutation) : Number(bareme.fraisMutation),
    tauxActuariel: dbParcelle.tauxActuariel !== null ? Number(dbParcelle.tauxActuariel) : Number(bareme.tauxActuariel),
    fraisGestion: dbParcelle.fraisGestion !== null ? Number(dbParcelle.fraisGestion) : Number(bareme.fraisGestion),
    fraisAcquisition: dbParcelle.fraisAcquisition !== null ? Number(dbParcelle.fraisAcquisition) : Number(bareme.fraisAcquisition),
  });

  const parcelleObj = {
    id: dbParcelle.id,
    ref: dbParcelle.reference,
    rawPrice: rawPrice,
    price: displayedPrice,
    commune: dbParcelle.zone?.commune || "Bénin",
    tauxSansRisque: dbParcelle.tauxSansRisque !== null ? Number(dbParcelle.tauxSansRisque) : Number(bareme.tauxSansRisque),
    volatilite: dbParcelle.volatilite !== null ? Number(dbParcelle.volatilite) : Number(bareme.volatilite),
    fraisMutation: dbParcelle.fraisMutation !== null ? Number(dbParcelle.fraisMutation) : Number(bareme.fraisMutation),
    tauxActuariel: dbParcelle.tauxActuariel !== null ? Number(dbParcelle.tauxActuariel) : Number(bareme.tauxActuariel),
    fraisGestion: dbParcelle.fraisGestion !== null ? Number(dbParcelle.fraisGestion) : Number(bareme.fraisGestion),
    fraisAcquisition: dbParcelle.fraisAcquisition !== null ? Number(dbParcelle.fraisAcquisition) : Number(bareme.fraisAcquisition),
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Dossier de souscription d'assurance</h1>
        <p className="text-sm text-text-2 mt-1">
          Souscrivez à un plan de financement pour la parcelle <span className="font-mono font-bold text-primary">{parcelleObj.ref}</span> ({parcelleObj.commune})
        </p>
      </div>

      <SubscriptionWizard user={user} parcelle={parcelleObj} />
    </div>
  );
}
