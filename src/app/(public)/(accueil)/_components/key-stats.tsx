import { Reveal } from "@/components/shared/reveal";
import { StatCounter } from "@/components/shared/stat-counter";

const STATS = [
  { value: 1240, suffix: "+", fallback: "1 240+", label: "Parcelles vendues" },
  { value: 14, suffix: "", fallback: "14", label: "Villes couvertes" },
  { value: 98, suffix: "%", fallback: "98%", label: "Clients satisfaits" },
  { value: 7, suffix: " ans", fallback: "7 ans", label: "d'accompagnement local" },
];

export function KeyStats() {
  return (
    <section className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,80px)] py-[clamp(56px,7vw,88px)]">
      <Reveal className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[clamp(20px,3vw,40px)]">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="relative flex flex-col gap-[6px] border-t-2 border-border py-1"
          >
            <span className="absolute top-[-2px] left-0 h-[2px] w-11 bg-primary" />
            <StatCounter
              value={s.value}
              suffix={s.suffix}
              fallback={s.fallback}
              className="mt-[14px] font-display text-[clamp(36px,4.5vw,52px)] leading-none font-semibold text-text"
            />
            <span className="font-sans text-[15px] leading-[1.4] font-medium text-text-2">
              {s.label}
            </span>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
