export function TrustNote() {
  return (
    <div className="mt-[14px] flex items-start gap-[10px] rounded-[14px] border border-[color-mix(in_srgb,var(--gold)_35%,transparent)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] px-4 py-[14px]">
      <span className="mt-[5px] size-2 flex-none rounded-full bg-gold" />
      <p className="m-0 font-sans text-[12.5px] leading-[1.5] text-text-2">
        Toutes nos parcelles sont vérifiées par un géomètre et un notaire
        partenaire avant mise en vente.
      </p>
    </div>
  );
}
