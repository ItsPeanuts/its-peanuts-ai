import type { Metadata } from "next";

const URL = "https://www.vorzaiq.com/voorwaarden";

export const metadata: Metadata = {
  title: "Algemene Voorwaarden — VorzaIQ",
  description: "Algemene voorwaarden voor het gebruik van VorzaIQ.",
  openGraph: { url: URL },
  alternates: { canonical: URL },
};

export default function VoorwaardenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
