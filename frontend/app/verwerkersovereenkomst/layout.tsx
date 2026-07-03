import type { Metadata } from "next";

const URL = "https://www.vorzaiq.com/verwerkersovereenkomst";

export const metadata: Metadata = {
  title: "Verwerkersovereenkomst",
  description: "Verwerkersovereenkomst (bijlage 1 bij de Algemene Voorwaarden) van VorzaIQ.",
  openGraph: { url: URL },
  alternates: { canonical: URL },
};

export default function VerwerkersovereenkomstLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
