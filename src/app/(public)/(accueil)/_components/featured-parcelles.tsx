import Link from "next/link";
import Image from "next/image";
import { MapPin, Ruler } from "lucide-react";

import { Reveal } from "@/components/shared/reveal";
import { fmtFCFA, PARCELLES } from "@/lib/parcelles";

const DEFAULT_HERO_IMAGES = [
  "/images/hero/hero4.jpg",
  "/images/hero/hero3.jpg",
  "/images/hero/hero2.jpg",
];

export function FeaturedParcelles({ parcelles = [] }: { parcelles?: any[] }) {
  // Combine BDD parcelles with fallback static data if less than 3
  const itemsToDisplay = parcelles.length > 0 ? parcelles.slice(0, 3) : PARCELLES.slice(0, 3);

  return (
    <section
      id="parcelles"
      className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,80px)] py-[clamp(56px,7vw,96px)]"
    >
      <Reveal className="mb-[clamp(32px,4vw,48px)] flex flex-col items-center justify-center text-center">
        <h2 className="font-display text-[clamp(32px,4vw,44px)] leading-[1.1] font-semibold tracking-[-0.02em] text-primary">
          Les parcelles récentes
        </h2>
        <div className="mt-3 h-[4px] w-16 rounded-full bg-primary" />
      </Reveal>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {itemsToDisplay.map((p: any, i: number) => {
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
            <Reveal as="article" key={ref} delay={i * 0.05} className="h-full">
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
                {/* Image & Badge */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-2">
                  <Image
                    src={imageUrl}
                    alt={`Parcelle ${ref}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-300 hover:scale-105"
                  />
                  <div className="absolute top-3 right-3">
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
                  <h3 className="font-display text-xl font-bold text-text">
                    {ref}
                  </h3>

                  <div className="mt-3 flex items-center gap-2 font-sans text-sm text-text-2">
                    <Ruler className="size-4 shrink-0 text-text-2" />
                    <span>{area.toFixed(2)} m²</span>
                  </div>

                  <div className="mt-2 flex items-start gap-2 font-sans text-sm text-text-2">
                    <MapPin className="size-4 shrink-0 text-text-2 mt-0.5" />
                    <span className="line-clamp-2">{locationStr}</span>
                  </div>

                  <div className="mt-4 font-sans text-sm text-text-2">
                    A partir de:{" "}
                    <span className="font-bold text-emerald-500">
                      {fmtFCFA(dailyRate > 0 ? dailyRate : price)} FCFA
                    </span>{" "}
                    / jrs
                  </div>

                  {/* Detail CTA Button */}
                  <div className="mt-5 pt-2">
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
            </Reveal>
          );
        })}
      </div>

      <Reveal className="mt-12 flex justify-center" delay={0.2}>
        <Link
          href="/parcelles"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-sans text-sm font-semibold text-on-primary shadow-lg transition-all duration-200 hover:bg-primary/90 hover:shadow-xl active:scale-[0.98]"
        >
          Voir plus de parcelles
          <span className="font-mono text-base">→</span>
        </Link>
      </Reveal>
    </section>
  );
}

