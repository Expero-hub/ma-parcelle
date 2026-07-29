import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function BaremesPage() {
  await requirePermission("read");

  const bareme = await prisma.baremeTechniqueDefaut.findFirst({
    where: { isActive: true },
    orderBy: { effectiveFrom: "desc" },
  });

  const formatPercent = (val: any) => {
    if (val === null || val === undefined) return "—";
    return `${(Number(val) * 100).toFixed(2)} %`;
  };

  const parameters = [
    { name: "Taux sans risque", value: formatPercent(bareme?.tauxSansRisque) },
    { name: "Volatilité", value: formatPercent(bareme?.volatilite) },
    { name: "Frais de mutation", value: formatPercent(bareme?.fraisMutation) },
    { name: "Taux actuariel (Taux technique)", value: formatPercent(bareme?.tauxActuariel) },
    { name: "Frais de gestion", value: formatPercent(bareme?.fraisGestion) },
    { name: "Frais d'acquisition", value: formatPercent(bareme?.fraisAcquisition) },
    { name: "Garantie en cas de décès (Âge max)", value: "70 ans" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Barèmes techniques par défaut</h1>
        <p className="text-sm text-text-2 mt-1">
          Valeurs globales utilisées par défaut pour les simulations de financement
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left font-sans text-sm border-collapse">
          <thead className="bg-surface-2 text-text font-semibold border-b border-border">
            <tr>
              <th className="px-5 py-3.5">Paramètre technique</th>
              <th className="px-5 py-3.5">Valeur par défaut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text">
            {parameters.map((param, index) => (
              <tr key={index} className="hover:bg-surface-2/40 transition-colors">
                <td className="px-5 py-4 font-medium text-text">{param.name}</td>
                <td className="px-5 py-4 font-mono font-bold text-primary">{param.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
