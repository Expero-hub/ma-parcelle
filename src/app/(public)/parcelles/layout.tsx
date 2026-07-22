import { SiteFooter } from "@/components/shared/site-footer";

export default function ParcellesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="flex-1">{children}</main>
      <SiteFooter variant="mini" />
    </>
  );
}
