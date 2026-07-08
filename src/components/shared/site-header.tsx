"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BrandLogo } from "@/components/shared/brand-logo";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { useSession } from "@/lib/auth-client";
import { UserMenu } from "@/components/shared/user-menu";

const NAV_ITEMS = [
  { label: "Accueil", href: "/" },
  { label: "Parcelles", href: "/parcelles" },
  { label: "Comment ça marche", href: "/#process" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/#")) return false;
  return pathname === href || pathname.startsWith(href + "/");
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const role = session?.user.role;
  const espaceHref = role === "admin" || role === "staff" ? "/dashboard" : "/mon-espace";
  const espaceLabel = role === "admin" || role === "staff" ? "Dashboard" : "Mon espace";

  return (
    <header className="sticky top-0 z-60 border-b border-border bg-[color-mix(in_srgb,var(--bg)_90%,transparent)] backdrop-blur-[12px]">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-[clamp(16px,4vw,64px)] py-[14px]">
        <BrandLogo />

        <nav className="hidden items-center gap-[26px] md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive(pathname, item.href)
                  ? "font-sans text-[14.5px] font-semibold whitespace-nowrap text-primary"
                  : "font-sans text-[14.5px] font-medium whitespace-nowrap text-text transition-colors hover:text-primary"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ModeToggle />
          {session ? (
            <>
              <Link
                href={espaceHref}
                className="hidden px-[14px] py-[10px] font-sans text-sm font-semibold text-text transition-colors hover:text-primary md:inline"
              >
                {espaceLabel}
              </Link>
              <UserMenu name={session.user.name} />
            </>
          ) : (
            <Link
              href="/connexion"
              className="hidden px-[14px] py-[10px] font-sans text-sm font-semibold text-text transition-colors hover:text-primary md:inline"
            >
              Connexion
            </Link>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            className="flex cursor-pointer flex-col gap-[5px] rounded-[10px] border border-border bg-transparent px-[10px] py-[11px] md:hidden"
          >
            <span className="h-[2px] w-5 rounded-[2px] bg-text" />
            <span className="h-[2px] w-5 rounded-[2px] bg-text" />
            <span className="h-[2px] w-5 rounded-[2px] bg-text" />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-bg px-[clamp(16px,4vw,64px)] pt-3 pb-[22px] md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-border px-[6px] py-3 font-sans text-base font-medium text-text"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={session ? espaceHref : "/connexion"}
              onClick={() => setOpen(false)}
              className="mt-[14px] rounded-[10px] bg-primary p-[14px] text-center font-sans text-[15px] font-semibold text-on-primary"
            >
              {session ? espaceLabel : "Connexion"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
