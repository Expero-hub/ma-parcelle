"use client";

import { useEffect, useRef, useState } from "react";

import { fmtFCFA } from "@/lib/parcelles";

/** Compteur animé (count-up, easing cubic) déclenché à l'entrée dans le viewport. */
export function StatCounter({
  value,
  suffix = "",
  fallback,
  className,
}: {
  value: number;
  suffix?: string;
  /** valeur affichée avant animation / si reduced-motion (ex. « 1 240+ ») */
  fallback: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let raf = 0;
    if (reduce || !("IntersectionObserver" in window)) {
      raf = requestAnimationFrame(() => setDisplay(fmtFCFA(value) + suffix));
      return () => cancelAnimationFrame(raf);
    }

    const animate = () => {
      const dur = 1400;
      const start = performance.now();
      const step = (now: number) => {
        let p = Math.min(1, (now - start) / dur);
        p = 1 - Math.pow(1 - p, 3);
        setDisplay(fmtFCFA(Math.round(value * p)) + suffix);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animate();
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, suffix]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
