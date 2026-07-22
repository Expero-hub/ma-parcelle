import { cn } from "@/lib/utils";

/**
 * Repère cadastral : pastille ronde façon borne d'arpentage + code en
 * IBM Plex Mono (ex. « B-01 »). Élément signature du design.
 */
export function CadastralBadge({
  code,
  active = false,
  className,
}: {
  code: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-[50px] items-center justify-center rounded-full font-mono text-[13px] font-medium transition-all duration-300",
        active
          ? "border-[1.5px] border-primary bg-primary text-on-primary shadow-[var(--shadow-hover)]"
          : "border-[1.5px] border-dashed border-primary bg-surface text-primary",
        className,
      )}
    >
      {code}
    </div>
  );
}
