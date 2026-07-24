import Link from "next/link";

const FOOTER_COLS = [
  {
    title: "Explorer",
    links: [
      { label: "Découvrir les parcelles", href: "/parcelles" },
      { label: "Comment ça marche", href: "/#process" },
      { label: "Actualités & ressources", href: "#" },
      { label: "FAQ", href: "#" },
    ],
  },
  
];

function MiniFooter() {
  return (
    <footer className="mt-6 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-[clamp(16px,4vw,64px)] py-7">
        <span className="font-sans text-[13px] leading-[1.4] text-text-2">
          © 2026 Ma Parcelle · Bénin
        </span>
        <div className="flex flex-wrap gap-5">
          <Link
            href="/"
            className="font-sans text-[13px] text-text-2 transition-colors hover:text-primary"
          >
            Accueil
          </Link>
          <Link
            href="#"
            className="font-sans text-[13px] text-text-2 transition-colors hover:text-primary"
          >
            Mentions légales
          </Link>
          <Link
            href="#"
            className="font-sans text-[13px] text-text-2 transition-colors hover:text-primary"
          >
            Confidentialité
          </Link>
        </div>
      </div>
    </footer>
  );
}

function FullFooter() {
  return (
    <footer id="contact" className="border-t border-border bg-surface">
      <div className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,80px)] pt-[clamp(48px,6vw,72px)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[clamp(28px,4vw,48px)] pb-12">
          {/* brand */}
          <div className="min-w-[220px]">
            <div className="mb-4 flex items-center gap-[11px]">
              <span className="relative flex size-8 flex-none items-center justify-center rounded-full border-[1.5px] border-primary">
                <span className="absolute h-[1.5px] w-8 bg-primary opacity-55" />
                <span className="absolute h-8 w-[1.5px] bg-primary opacity-55" />
                <span className="size-[7px] rounded-full bg-primary" />
              </span>
              <span className="font-display text-lg font-semibold">
                Ma Parcelle
              </span>
            </div>
            <p className="mb-[18px] max-w-[260px] font-sans text-sm leading-[1.6] text-text-2">
              La terre en confiance. Achat de parcelles vérifiées au Bénin, avec
              paiement échelonné et accompagnement.
            </p>
            <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--gold)_45%,transparent)] px-3 py-2 font-mono text-[11px] font-medium tracking-[0.05em] text-gold">
              <span className="size-[7px] rounded-full bg-gold" />
              TITRES FONCIERS VÉRIFIÉS
            </span>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <div className="mb-4 font-sans text-[13px] font-semibold tracking-[0.06em] text-text uppercase">
                {col.title}
              </div>
              <div className="flex flex-col gap-[11px]">
                {col.links.map((lnk) => (
                  <Link
                    key={lnk.label}
                    href={lnk.href}
                    className="font-sans text-sm leading-[1.3] text-text-2 transition-colors hover:text-primary"
                  >
                    {lnk.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* contact */}
          <div>
            <div className="mb-4 font-sans text-[13px] font-semibold tracking-[0.06em] text-text uppercase">
              Contact
            </div>
            <div className="flex flex-col gap-[11px] font-sans text-sm leading-[1.5] text-text-2">
              <span>
                Lot 42, Haie Vive
                <br />
                Cotonou, Bénin
              </span>
              <a
                href="tel:+22921000000"
                className="font-mono text-[13px] text-text-2 transition-colors hover:text-primary"
              >
                +229 21 00 00 00
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 font-semibold text-secondary transition-colors hover:text-primary"
              >
                <span className="size-2 rounded-full bg-secondary" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-[22px]">
          <span className="font-sans text-[13px] leading-[1.4] text-text-2">
            © 2026 Ma Parcelle · Bénin
          </span>
          <div className="flex flex-wrap gap-5">
            {["Mentions légales", "Politique de confidentialité", "CGV"].map(
              (l) => (
                <Link
                  key={l}
                  href="#"
                  className="font-sans text-[13px] text-text-2 transition-colors hover:text-primary"
                >
                  {l}
                </Link>
              ),
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

export function SiteFooter({ variant = "full" }: { variant?: "full" | "mini" }) {
  return variant === "mini" ? <MiniFooter /> : <FullFooter />;
}
