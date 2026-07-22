import { Reveal } from "@/components/shared/reveal";

const TESTIMONIALS = [
  {
    quote:
      "J'ai réservé depuis Paris et payé en 12 mensualités. Tout était clair, du bornage au titre foncier. Aucune mauvaise surprise.",
    name: "Ariane K.",
    meta: "AC-0142 · Abomey-Calavi",
    initials: "AK",
  },
  {
    quote:
      "Ce qui m'a rassuré, c'est de voir le titre vérifié et le plan cadastral avant même de me déplacer. On sent le sérieux.",
    name: "Serge D.",
    meta: "OU-0076 · Ouidah",
    initials: "SD",
  },
  {
    quote:
      "Un conseiller m'a accompagné à chaque étape. Aujourd'hui je suis propriétaire de ma parcelle, sereinement.",
    name: "Florentine A.",
    meta: "PN-0311 · Porto-Novo",
    initials: "FA",
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,80px)] py-[clamp(56px,7vw,96px)]">
      <Reveal className="mb-[clamp(32px,4vw,48px)]">
        <div className="mb-[14px] font-mono text-xs font-medium tracking-[0.14em] text-primary">
          ILS ONT ACHETÉ AVEC NOUS
        </div>
        <h2 className="font-display text-[clamp(30px,4vw,40px)] leading-[1.1] font-semibold tracking-[-0.02em]">
          Des propriétaires sereins
        </h2>
      </Reveal>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[clamp(20px,2.5vw,28px)]">
        {TESTIMONIALS.map((t, i) => (
          <Reveal
            as="figure"
            key={t.name}
            delay={i * 0.05}
            className="m-0 flex flex-col gap-5 rounded-2xl border border-border bg-surface p-7 shadow-[var(--shadow)]"
          >
            <span className="h-[22px] font-display text-[40px] leading-none text-primary">
              &ldquo;
            </span>
            <blockquote className="m-0 flex-1 font-sans text-[17px] leading-[1.6] text-text">
              {t.quote}
            </blockquote>
            <figcaption className="flex items-center gap-3 border-t border-border pt-[18px]">
              <span className="flex size-11 flex-none items-center justify-center rounded-full border border-border bg-surface-2 font-display text-[15px] font-semibold text-primary">
                {t.initials}
              </span>
              <span className="flex flex-col">
                <span className="font-sans text-[15px] leading-[1.2] font-semibold text-text">
                  {t.name}
                </span>
                <span className="mt-[3px] font-mono text-xs leading-[1.3] text-text-2">
                  {t.meta}
                </span>
              </span>
            </figcaption>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
