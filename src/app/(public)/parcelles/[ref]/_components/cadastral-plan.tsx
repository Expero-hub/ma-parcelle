import { STATUT_META, type Parcelle } from "@/lib/parcelles";

/** Mini plan cadastral (SVG) + description de la parcelle. */
export function CadastralPlan({ p }: { p: Parcelle }) {
  const color = STATUT_META[p.statut].color;
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] items-start gap-5">
      <div>
        <h3 className="mb-3 font-display text-lg leading-[1.2] font-semibold">
          Plan cadastral
        </h3>
        <div className="aspect-square overflow-hidden rounded-[14px] border border-border bg-surface-2">
          <svg viewBox="0 0 200 200" width="100%" height="100%">
            <rect x="0" y="0" width="200" height="200" fill="var(--surface-2)" />
            <line
              x1="20"
              y1="100"
              x2="180"
              y2="100"
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <line
              x1="100"
              y1="20"
              x2="100"
              y2="180"
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <polygon
              points={p.plan}
              style={{
                fill: color,
                fillOpacity: 0.4,
                stroke: color,
                strokeWidth: 2.5,
                strokeLinejoin: "round",
              }}
            />
            <text
              x="100"
              y="106"
              textAnchor="middle"
              style={{
                font: "500 11px var(--font-plex-mono), monospace",
                fill: "var(--text)",
              }}
            >
              {p.ref}
            </text>
          </svg>
        </div>
      </div>
      <div>
        <h3 className="mb-3 font-display text-lg leading-[1.2] font-semibold">
          À propos de cette parcelle
        </h3>
        <p className="m-0 font-sans text-[15px] leading-[1.65] text-text-2">
          {p.desc}
        </p>
      </div>
    </div>
  );
}
