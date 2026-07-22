import Link from "next/link";
import Image from "next/image";

import { HeroSearch } from "./hero-search";

type HeroImage = {
  src: string;
  alt: string;
};

// Remplace ces chemins par tes vraies images (celles déjà visibles sur le site).
const DEFAULT_IMAGES: [HeroImage, HeroImage, HeroImage] = [
  { src: "/images/hero/hero4.jpg", alt: "Maison sur une parcelle avec repère de localisation" },
  // TODO: remplacer par les chemins réels une fois les images disponibles.
  { src: "/images/hero/hero3.jpg", alt: "Vue aérienne d'une parcelle délimitée" },
  { src: "/images/hero/hero2.jpg", alt: "Terrain avec repère de localisation" },
];

export function Hero({
  images = DEFAULT_IMAGES,
}: {
  images?: [HeroImage, HeroImage, HeroImage];
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
            La terre,
            <br />
            en toute confiance.
          </h1>

          <p className="mt-5 max-w-[500px] animate-[fadeUp_.7s_.12s_both] font-sans text-[clamp(17px,2vw,19px)] leading-[1.6] text-hero-soft">
            Trouvez, réservez et payez votre parcelle à votre rythme. Titres
            fonciers vérifiés, bornage certifié et accompagnement local, du
            premier repérage à la signature.
          </p>

          <div className="mt-6 animate-[fadeUp_.7s_.15s_both]">
            <Link
              href="/parcelles"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-sans text-base font-semibold text-on-primary shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl hover:brightness-105"
            >
              Découvrir les parcelles
              <span className="font-mono text-lg">→</span>
            </Link>
          </div>

          <div className="animate-[fadeUp_.7s_.18s_both]">
            <HeroSearch />
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

        {/* Right: 3 images — 1 grande + 2 empilées sur desktop, colonne unique sur mobile */}
        <div className="relative animate-[fadeUp_.8s_.2s_both]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:grid-rows-2 sm:aspect-[4/3.4]">
            {/* Image principale (grande, à gauche sur desktop) */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] border border-[rgba(244,236,225,0.14)] shadow-[0_24px_60px_rgba(0,0,0,0.45)] sm:aspect-auto sm:row-span-2">
              <Image
                src={images[0].src}
                alt={images[0].alt}
                fill
                sizes="(max-width: 640px) 100vw, 40vw"
                className="object-cover"
                priority
              />
            </div>

            {/* Image secondaire (haut, à droite sur desktop) */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] border border-[rgba(244,236,225,0.14)] shadow-[0_16px_40px_rgba(0,0,0,0.4)] sm:aspect-auto">
              <Image
                src={images[1].src}
                alt={images[1].alt}
                fill
                sizes="(max-width: 640px) 100vw, 30vw"
                className="object-cover"
              />
            </div>

            {/* Image secondaire (bas, à droite sur desktop) */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] border border-[rgba(244,236,225,0.14)] shadow-[0_16px_40px_rgba(0,0,0,0.4)] sm:aspect-auto">
              <Image
                src={images[2].src}
                alt={images[2].alt}
                fill
                sizes="(max-width: 640px) 100vw, 30vw"
                className="object-cover"
              />
            </div>
          </div>

          {/* floating mini parcelle card */}
          <div className="absolute -right-[6px] -bottom-[26px] w-[220px] animate-[floatY_6s_ease-in-out_infinite] rounded-[14px] bg-surface p-[14px] text-text shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
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
