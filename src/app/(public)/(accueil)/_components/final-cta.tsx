import Link from "next/link";

import { Reveal } from "@/components/shared/reveal";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,80px)] pb-[clamp(56px,7vw,96px)]">
      <Reveal className="relative overflow-hidden rounded-3xl bg-hero-bg px-[clamp(28px,5vw,64px)] py-[clamp(40px,6vw,72px)] text-hero-text">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(var(--hero-line) 1px,transparent 1px),linear-gradient(90deg,var(--hero-line) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="pointer-events-none absolute -top-[90px] -right-[60px] size-[300px] rounded-full border-[1.5px] border-dashed border-[rgba(201,150,44,0.3)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-7">
          <div className="max-w-[560px]">
            <div className="mb-4 font-mono text-xs font-medium tracking-[0.14em] text-gold">
              PRÊT À VOUS ANCRER ?
            </div>
            <h2 className="mb-[14px] font-display text-[clamp(28px,4vw,42px)] leading-[1.1] font-semibold tracking-[-0.02em]">
              Votre parcelle vous attend quelque part au Bénin.
            </h2>
            <p className="font-sans text-[17px] leading-[1.6] text-hero-soft">
              Parcourez la carte, comparez les prix et réservez en ligne — sans
              engagement tant que vous n’avez pas signé.
            </p>
          </div>
          <div className="flex flex-wrap gap-[14px]">
            <Link
              href="/parcelles"
              className="rounded-[10px] bg-primary px-7 py-4 font-sans text-base font-semibold text-on-primary shadow-[var(--shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]"
            >
              Découvrir les parcelles
            </Link>
            <Link
              href="#contact"
              className="rounded-[10px] border border-[rgba(244,236,225,0.3)] px-7 py-4 font-sans text-base font-semibold text-hero-text transition-colors hover:border-gold hover:text-gold"
            >
              Parler à un conseiller
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
