import Image from "next/image";

import { HeroSearch } from "./hero-search";

export function Hero({
  zoneNames = [],
}: {
  zoneNames?: string[];
}) {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-hero-bg text-hero-text"
    >
      {/* warm glow backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(115% 90% at 82% 6%, rgba(177,80,47,0.24), transparent 55%), radial-gradient(75% 70% at 8% 100%, rgba(201,150,44,0.10), transparent 60%)",
        }}
      />
      <div className="pointer-events-none absolute -top-[120px] -right-[80px] size-[420px] rounded-full border-[1.5px] border-dashed border-[rgba(201,150,44,0.35)]" />
      <div className="pointer-events-none absolute -top-[40px] right-0 size-[260px] rounded-full border-[1.5px] border-dashed border-[rgba(201,150,44,0.22)]" />

      <div className="relative mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-[clamp(40px,5vw,72px)] px-[clamp(20px,5vw,80px)] pt-[clamp(48px,7vw,88px)] pb-[clamp(64px,7vw,96px)]">
        {/* Left: copy + search */}
        <div className="max-w-[620px]">
          <div className="inline-flex animate-[fadeUp_.7s_both] items-center gap-[10px] rounded-full border border-[rgba(201,150,44,0.4)] px-[14px] py-2 font-mono text-xs font-medium tracking-[0.14em] text-gold">
            <span className="size-[7px] rounded-full bg-gold" />
            VENTE DE PARCELLES · BÉNIN
          </div>

          <h1 className="mt-[22px] animate-[fadeUp_.7s_.06s_both] font-display text-[clamp(38px,6vw,58px)] leading-[1.04] font-semibold tracking-[-0.02em]">
            Trouvez et réservez votre terrain en toute simplicité.
          </h1>

          <p className="mt-5 max-w-[500px] animate-[fadeUp_.7s_.12s_both] font-sans text-[clamp(17px,2vw,19px)] leading-[1.6] text-hero-soft">
           Découvrez nos parcelles disponibles partout au Bénin. Réservez et payez à votre rythme : en plusieurs fois ou en un seul paiement.
          </p>

          <div className="animate-[fadeUp_.7s_.18s_both]">
            <HeroSearch zoneNames={zoneNames} />
          </div>

          <div className="mt-[22px] flex flex-wrap gap-[22px] font-sans text-[13px] font-medium text-hero-soft">
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-gold" />
              Titres fonciers vérifiés
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#5C8A5F]" />
              Paiement échelonné
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#D97A54]" />
              Accompagnement local
            </span>
          </div>
        </div>

        {/* Right: real parcel photo */}
        <div className="relative animate-[fadeUp_.8s_.2s_both]">
          <div className="relative aspect-[4/3.4] overflow-hidden rounded-[18px] border border-border shadow-[var(--shadow-hover)]">
            <Image
              src="/images/hero/hero-parcelle.png"
              alt="Parcelle de terrain bornée au Bénin, sol de latérite, lumière du soir"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 640px) 100vw, 50vw"
            />
            {/* subtle bottom scrim for label legibility */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(20,18,15,0.55)] to-transparent to-[42%]" />
            {/* signature cadastral marker over the boundary post */}
            <div className="absolute left-[29%] top-[64%] flex size-[66px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-dashed border-[rgba(201,150,44,0.95)]">
              <span className="size-[9px] rounded-full bg-gold" />
              <span className="absolute inset-[-8px] animate-[ringPulse_3s_ease-out_infinite] rounded-full border border-[rgba(201,150,44,0.7)]" />
            </div>
            {/* coord label */}
            <div className="absolute left-4 bottom-[14px] font-mono text-[11px] leading-[1.4] text-[rgba(244,236,225,0.9)]">
              6.3703° N · 2.3912° E
              <br />
              PARCELLE BORNÉE · COTONOU
            </div>
          </div>

          {/* floating mini parcelle card */}
          <div className="absolute -right-[6px] -bottom-[26px] w-[220px] animate-[floatY_6s_ease-in-out_infinite] rounded-[14px] bg-surface p-[14px] text-text shadow-[0_18px_40px_rgba(0,0,0,0.35)] border border-border">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-medium text-primary">
                AC-0142
              </span>
              <span className="rounded-full bg-secondary px-2 py-1 font-mono text-[10px] font-medium tracking-[0.05em] text-on-primary">
                DISPONIBLE
              </span>
            </div>
            <div className="mt-[9px] mb-[2px] font-display text-base font-semibold">
              Abomey-Calavi · Zopah
            </div>
            <div className="font-sans text-xs font-medium text-text-2">
              500 m²
            </div>
            <div className="mt-[10px] font-mono text-[15px] font-semibold text-text">
              4 500 000 <span className="text-[11px] text-text-2">FCFA</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
