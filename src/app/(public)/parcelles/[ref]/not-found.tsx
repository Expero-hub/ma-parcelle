import Link from "next/link";

export default function ParcelleNotFound() {
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-5 px-[clamp(16px,4vw,64px)] py-24 text-center">
      <span className="font-mono text-xs font-medium tracking-[0.14em] text-primary">
        ERREUR · 404
      </span>
      <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.1] font-semibold tracking-[-0.02em]">
        Parcelle introuvable
      </h1>
      <p className="max-w-[440px] font-sans text-base leading-[1.6] text-text-2">
        Cette référence n’existe pas ou n’est plus en ligne. Parcourez notre
        catalogue pour trouver la parcelle qui vous correspond.
      </p>
      <Link
        href="/parcelles"
        className="rounded-[10px] bg-primary px-[18px] py-3 font-sans text-sm font-semibold text-on-primary shadow-[var(--shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]"
      >
        ← Retour aux parcelles
      </Link>
    </div>
  );
}
