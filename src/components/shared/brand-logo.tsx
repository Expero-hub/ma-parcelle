import Link from "next/link";

/** Marque « borne cadastrale » : cercle + croix d'arpentage + point central. */
export function BrandLogo({
  href = "/",
  showTagline = true,
  markSize = 34,
}: {
  href?: string;
  showTagline?: boolean;
  markSize?: number;
}) {
  return (
    <Link
      href={href}
      aria-label="Ma Parcelle, accueil"
      className="flex items-center gap-[11px] text-text"
    >
      <span
        className="relative flex flex-none items-center justify-center rounded-full border-[1.5px] border-primary"
        style={{ width: markSize, height: markSize }}
      >
        <span
          className="absolute bg-primary opacity-55"
          style={{ width: markSize, height: 1.5 }}
        />
        <span
          className="absolute bg-primary opacity-55"
          style={{ height: markSize, width: 1.5 }}
        />
        <span className="size-2 rounded-full bg-primary" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-semibold tracking-[-0.01em]">
          Ma Parcelle
        </span>
        {showTagline && (
          <span className="mt-[3px] font-mono text-[10px] leading-[1.3] tracking-[0.04em] whitespace-nowrap text-text-2">
            LA TERRE, EN CONFIANCE
          </span>
        )}
      </span>
    </Link>
  );
}
