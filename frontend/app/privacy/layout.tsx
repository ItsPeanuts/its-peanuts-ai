import type { Metadata } from "next";

const URL = "https://www.vorzaiq.com/privacy";

export const metadata: Metadata = {
  title: "Privacybeleid — VorzaIQ",
  description: "Hoe VorzaIQ omgaat met jouw persoonlijke gegevens.",
  openGraph: { url: URL },
  alternates: { canonical: URL },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
