"use client";

import { useRef } from "react";
import { MapPin, Ruler, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/shared/reveal";
import { fmtFCFA, PARCELLES } from "@/lib/parcelles";
import { computeDisplayedPrice } from "@/lib/simulation/simulation";

const DEFAULT_HERO_IMAGES = [
  "/images/hero/hero4.jpg",
  "/images/hero/hero3.jpg",
  "/images/hero/hero2.jpg",
];

function FeaturedCard({ p, i }: { p: any; i: number }) {
  const isBdd = "reference" in p;
  const ref = isBdd ? p.reference : p.ref;
  const statusRaw = isBdd ? p.status : p.statut;
  const isReserved = statusRaw === "RESERVED" || statusRaw === "reserve";
  const isSold = statusRaw === "SOLD" || statusRaw === "vendu";

  const area = isBdd ? Number(p.area || 0) : p.surf;
  const price = isBdd ? Number(p.price || 0) : p.price;
  const dailyRate = Math.round(price / 720);

  const locationStr = isBdd
    ? [p.zone?.district, p.zone?.commune, p.zone?.department, "Bénin"]
      .filter(Boolean)
      .join(", ")
    : `${p.quartier}, ${p.ville}, Bénin`;

  const imageUrl =
    isBdd && p.images && p.images.length > 0
      ? p.images[0].path
      : DEFAULT_HERO_IMAGES[i % DEFAULT_HERO_IMAGES.length];

  return (
    <div className="w-[304px] sm:w-[364px] shrink-0 flex flex-col pr-6">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
        {/* Image & Badge */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-2 shrink-0">
          <Image
            src={imageUrl}
            alt={`Parcelle ${ref}`}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 hover:scale-105"
          />
          <div className="absolute top-3 right-3 z-10">
            {isReserved ? (
              <span className="rounded-md bg-red-500 px-3 py-1 font-sans text-xs font-semibold text-white shadow-sm">
                Réservée
              </span>
            ) : isSold ? (
              <span className="rounded-md bg-amber-500 px-3 py-1 font-sans text-xs font-semibold text-white shadow-sm">
                Vendue
              </span>
            ) : (
              <span className="rounded-md bg-emerald-500 px-3 py-1 font-sans text-xs font-semibold text-white shadow-sm">
                Disponible
              </span>
            )}
          </div>
        </div>

        {/* Card Content */}
        <div className="flex flex-1 flex-col p-5">
          <div className="mt-4 font-sans text-sm text-text-2">
            <span className="font-bold text-primary text-lg">
              {fmtFCFA(p.monthlyPayment7Years ?? 0)} F</span>{" "}
              <span className="text-text-2 text-base font-semibold">/mois sur 7 ans</span> 
            
            
          </div>

          <div className="mt-3 flex items-center gap-2 font-sans text-sm text-text-2">
            <Ruler className="size-4 shrink-0 text-text-2" />
            <span>{area.toFixed(2)} m²</span>
          </div>

          <div className="mt-2 flex items-start gap-2 font-sans text-sm text-text-2">
            <MapPin className="size-4 shrink-0 text-text-2 mt-0.5" />
            <span className="line-clamp-2">{locationStr}</span>
          </div>

          <div className="mt-4 flex items-center justify-between font-sans text-sm text-text-2">
            <span className="font-bold">
             {ref}
            </span>
            {!isReserved && !isSold && p.interestCount !== undefined && p.interestCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {p.interestCount} {p.interestCount > 1 ? "intéressés" : "intéressé"}
              </span>
            )}
          </div>

          {/* Detail CTA Button */}
          <div className="mt-auto pt-5">
            <Link
              href={`/parcelles/${encodeURIComponent(ref)}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-sans text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
            >
              Voir les détails
              <span className="font-mono text-base">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeaturedParcelles({ parcelles = [] }: { parcelles?: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const itemsToDisplay = parcelles.length > 0
    ? parcelles
    : PARCELLES.filter((p) => p.statut === "disponible")
        .slice(0, 10)
        .map((p) => ({
          ...p,
          rawPrice: p.price,
          price: computeDisplayedPrice({
            price: p.price,
            tauxSansRisque: p.tauxSansRisque,
            volatilite: p.volatilite,
            fraisMutation: p.fraisMutation,
            tauxActuariel: p.tauxActuariel,
            fraisGestion: p.fraisGestion,
            fraisAcquisition: p.fraisAcquisition,
          }),
        }));

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft } = scrollRef.current;
      const cardWidth = 364; // width sm:w-[364px]
      const targetScroll = direction === "left" ? scrollLeft - cardWidth : scrollLeft + cardWidth;
      scrollRef.current.scrollTo({
        left: targetScroll,
        behavior: "smooth",
      });
    }
  };

  return (
    <section
      id="parcelles"
      className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,80px)] py-[clamp(56px,7vw,96px)] overflow-x-hidden"
    >
      <Reveal className="mb-[clamp(32px,4vw,48px)] flex flex-col items-center justify-center text-center">
        <h2 className="font-display text-[clamp(32px,4vw,44px)] leading-[1.1] font-semibold tracking-[-0.02em] text-primary">
          Les parcelles disponibles
        </h2>
        <div className="mt-3 h-[4px] w-16 rounded-full bg-primary" />
      </Reveal>

      {/* Slider Container with Left and Right Arrows */}
      <div className="relative group -mx-[clamp(20px,5vw,80px)] px-[clamp(20px,5vw,80px)]">
        {/* Left Arrow */}
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex size-12 items-center justify-center rounded-full border border-border bg-surface text-text shadow-lg hover:bg-surface-2 hover:scale-105 active:scale-95 transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Précédent"
        >
          <ChevronLeft className="h-6 w-6 text-primary" />
        </button>

        {/* Scrollable List */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto scrollbar-none scroll-smooth snap-x snap-mandatory py-2 items-stretch"
        >
          {itemsToDisplay.map((p: any, i: number) => (
            <div key={p.reference || p.ref} className="snap-start">
              <FeaturedCard p={p} i={i} />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex size-12 items-center justify-center rounded-full border border-border bg-surface text-text shadow-lg hover:bg-surface-2 hover:scale-105 active:scale-95 transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Suivant"
        >
          <ChevronRight className="h-6 w-6 text-primary" />
        </button>
      </div>

      <Reveal className="mt-12 flex justify-center" delay={0.2}>
        <Link
          href="/parcelles"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-transparent px-8 py-3.5 font-sans text-sm font-semibold text-text shadow-xs transition-all duration-200 hover:bg-surface-2 active:scale-[0.98]"
        >
          Voir plus de parcelles
          <span className="font-mono text-base">→</span>
        </Link>
      </Reveal>
    </section>
  );
}

