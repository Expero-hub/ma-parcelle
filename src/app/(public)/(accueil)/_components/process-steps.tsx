"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";

import { CadastralBadge } from "@/components/shared/cadastral-badge";
import { Reveal } from "@/components/shared/reveal";

const STEPS = [
  {
    code: "B-01",
    step: "ÉTAPE 01",
    title: "Explorez",
    desc: "Parcourez la carte interactive et filtrez par ville, superficie et budget.",
  },
  {
    code: "B-02",
    step: "ÉTAPE 02",
    title: "Réservez",
    desc: "Choisissez votre parcelle et bloquez-la en ligne, en quelques minutes.",
  },
  {
    code: "B-03",
    step: "ÉTAPE 03",
    title: "Payez à votre rythme",
    desc: "Comptant ou échelonné : des mensualités claires, sans surprise.",
  },
  {
    code: "B-04",
    step: "ÉTAPE 04",
    title: "Suivez vos documents",
    desc: "Titre foncier, contrat et échéances réunis dans votre espace client.",
  },
];

function Motif({ index, active }: { index: number; active: boolean }) {
  if (index === 0) {
    const motif: CSSProperties = {
      position: "absolute",
      top: 12,
      transition: "transform .55s cubic-bezier(.22,1,.36,1)",
      left: active ? 74 : 18,
      transform: active ? "translateY(18px) scale(1.08)" : "translateY(0) scale(1)",
    };
    return (
      <div className="relative h-[66px] w-32 overflow-hidden rounded-xl bg-surface-2">
        <div
          className="absolute inset-0 text-border"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1.3px,transparent 1.5px)",
            backgroundSize: "15px 15px",
          }}
        />
        <span className="absolute top-[42px] left-[22px] size-2 rounded-full bg-secondary" />
        <span className="absolute top-[14px] right-[22px] size-2 rounded-full bg-primary" />
        <div style={motif}>
          <span className="block size-[26px] rounded-full border-[3px] border-primary bg-[color-mix(in_srgb,var(--gold)_22%,transparent)]" />
          <span className="absolute -right-[3px] -bottom-[3px] h-[3px] w-[11px] rotate-45 rounded-[2px] bg-primary" />
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="relative flex h-[66px] w-32 items-end justify-center">
        <div className="absolute bottom-3 h-[2px] w-24 bg-border" />
        <div
          className="absolute bottom-2 h-[11px] w-[34px] rounded-[50%] bg-primary"
          style={{
            transition: "all .5s ease",
            opacity: active ? 0.18 : 0,
            transform: active ? "scale(1)" : "scale(.3)",
          }}
        />
        <div
          className="absolute bottom-[14px]"
          style={{
            transition: "transform .5s cubic-bezier(.34,1.56,.64,1)",
            transform: active ? "translateY(-10px) scale(1.06)" : "translateY(0)",
          }}
        >
          <div className="flex size-7 rotate-[-45deg] items-center justify-center rounded-[50%_50%_50%_0] bg-primary shadow-[var(--shadow)]">
            <span className="size-[9px] rotate-45 rounded-full bg-surface" />
          </div>
        </div>
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="flex w-32 flex-col items-center gap-[13px]">
        <div className="flex items-center">
          <span className="size-6 rounded-full border-2 border-surface bg-gold" />
          <span className="-ml-[9px] size-6 rounded-full border-2 border-surface bg-[color-mix(in_srgb,var(--gold)_78%,#000)]" />
          <span className="-ml-[9px] size-6 rounded-full border-2 border-surface bg-gold" />
        </div>
        <div className="h-[9px] w-[108px] overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-secondary"
            style={{
              transition: "width .7s cubic-bezier(.22,1,.36,1)",
              width: active ? "100%" : "30%",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[66px] w-32 items-center justify-center">
      <div className="flex h-[62px] w-[50px] flex-col gap-[7px] rounded-[6px] border border-border bg-surface-2 px-[9px] py-[11px]">
        <span className="h-[3px] w-full rounded-[2px] bg-border" />
        <span className="h-[3px] w-4/5 rounded-[2px] bg-border" />
        <span className="h-[3px] w-[92%] rounded-[2px] bg-border" />
        <span className="h-[3px] w-3/5 rounded-[2px] bg-border" />
      </div>
      <div
        className="absolute top-[6px] right-7 size-[26px] rounded-full bg-secondary"
        style={{
          transition: "all .45s cubic-bezier(.34,1.56,.64,1)",
          opacity: active ? 1 : 0,
          transform: active ? "scale(1)" : "scale(.3)",
        }}
      >
        <span className="absolute top-3 left-2 h-[2.5px] w-[5px] origin-left rotate-45 rounded-[2px] bg-white" />
        <span className="absolute top-[13px] left-[10px] h-[2.5px] w-3 origin-left -rotate-[52deg] rounded-[2px] bg-white" />
      </div>
    </div>
  );
}

export function ProcessSteps() {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <section id="process" className="bg-surface-2">
      <div className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,80px)] py-[clamp(56px,7vw,96px)]">
        <Reveal className="mb-[clamp(36px,5vw,56px)] flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-[14px] font-mono text-xs font-medium tracking-[0.14em] text-primary">
              LE PARCOURS · 4 REPÈRES
            </div>
            <h2 className="max-w-[520px] font-display text-[clamp(30px,4vw,40px)] leading-[1.1] font-semibold tracking-[-0.02em]">
              Comment ça marche
            </h2>
            <p className="mt-3 max-w-[440px] font-sans text-base leading-[1.5] text-text-2">
              Survolez chaque repère pour voir l’étape s’animer.
            </p>
          </div>
          <Link
            href="#"
            className="group inline-flex items-center gap-2 font-sans text-[15px] font-semibold text-primary"
          >
            Voir le parcours détaillé{" "}
            <span className="font-mono transition-all group-hover:translate-x-1">
              →
            </span>
          </Link>
        </Reveal>

        <Reveal
          delay={0.1}
          className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-[clamp(18px,2vw,24px)]"
        >
          {STEPS.map((s, i) => (
            <div
              key={s.code}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="flex flex-col gap-[18px] rounded-3xl border border-border bg-surface p-6 shadow-[var(--shadow)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-hover)]"
            >
              <div className="flex items-center justify-between">
                <CadastralBadge code={s.code} active={hover === i} />
                <span className="font-mono text-[11px] font-medium tracking-[0.06em] text-text-2">
                  {s.step}
                </span>
              </div>
              <div className="flex h-[78px] items-center justify-center">
                <Motif index={i} active={hover === i} />
              </div>
              <div>
                <h3 className="mb-[6px] font-display text-[19px] leading-[1.25] font-semibold">
                  {s.title}
                </h3>
                <p className="font-sans text-[14.5px] leading-[1.55] text-text-2">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
