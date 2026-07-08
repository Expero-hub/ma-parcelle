import { BrandLogo } from "@/components/shared/brand-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <BrandLogo />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-[var(--shadow)]">
          {children}
        </div>
      </div>
    </main>
  );
}
