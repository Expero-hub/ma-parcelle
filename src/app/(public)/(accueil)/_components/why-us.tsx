import { Reveal } from "@/components/shared/reveal";

const FEATURES = [
  {
    code: "G-01",
    title: "Sécurité juridique",
    desc: "Chaque parcelle est vérifiée : titre foncier, bornage certifié et partenaires notariés. Vous savez exactement ce que vous achetez.",
    tint: "color-mix(in srgb, var(--gold) 16%, transparent)",
    iconColor: "var(--gold)",
  },
  {
    code: "G-02",
    title: "Paiement échelonné",
    desc: "Devenez propriétaire progressivement, avec des mensualités adaptées à votre budget et un échéancier transparent.",
    tint: "color-mix(in srgb, var(--secondary) 16%, transparent)",
    iconColor: "var(--secondary)",
  },
  {
    code: "G-03",
    title: "Accompagnement",
    desc: "Une équipe locale vous guide de la visite du terrain à la signature, et reste joignable après l'achat.",
    tint: "color-mix(in srgb, var(--primary) 16%, transparent)",
    iconColor: "var(--primary)",
  },
];

export function WhyUs() {
  return (
    <section className="bg-surface-2">
      <div className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,80px)] py-[clamp(56px,7vw,96px)]">
        <Reveal className="mb-[clamp(36px,5vw,56px)] max-w-[560px]">
          <div className="mb-[14px] font-mono text-xs font-medium tracking-[0.14em] text-primary">
            POURQUOI MA PARCELLE
          </div>
          <h2 className="mb-[14px] font-display text-[clamp(30px,4vw,40px)] leading-[1.1] font-semibold tracking-[-0.02em]">
            Acheter de la terre, sans y laisser sa tranquillité
          </h2>
          <p className="font-sans text-lg leading-[1.6] text-text-2">
            On sécurise chaque étape pour que votre investissement reste ce qu’il
            doit être : un patrimoine, pas une source d’inquiétude.
          </p>
        </Reveal>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[clamp(20px,2.5vw,28px)]">
          {FEATURES.map((f, i) => (
            <Reveal
              key={f.code}
              delay={i * 0.05}
              className="flex flex-col gap-[14px] rounded-2xl border border-border bg-surface p-7 shadow-[var(--shadow)]"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex size-11 flex-none items-center justify-center rounded-xl font-mono text-xs font-medium"
                  style={{ background: f.tint, color: f.iconColor }}
                >
                  {f.code}
                </span>
                <h3 className="font-display text-[21px] leading-[1.2] font-semibold">
                  {f.title}
                </h3>
              </div>
              <p className="font-sans text-[15px] leading-[1.6] text-text-2">
                {f.desc}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
