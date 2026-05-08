import type { Metadata } from "next";
import "./globals.css";
import NoHorizontalScroll from "@/components/NoHorizontalScroll";
import MaintenanceBanner from "@/components/MaintenanceBanner";
import { LanguageProvider } from "@/lib/i18n";
import HtmlLangSync from "@/components/HtmlLangSync";
import VisitTracker from "@/components/VisitTracker";
import CookieConsent from "@/components/CookieConsent";

const SITE_URL = "https://www.vorzaiq.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VorzaIQ — AI Recruitment Platform voor MKB | Nederland",
    template: "%s | VorzaIQ",
  },
  description:
    "Upload je CV en ontvang direct AI-matches. Werkgevers: vind kandidaten sneller met Lisa, onze AI-recruiter.",
  openGraph: {
    siteName: "VorzaIQ",
    locale: "nl_NL",
    type: "website",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  verification: {
    google: "gETe5OY1ntOsM9KhIxKo5PVEJQ7KSO3JrFNklSBwJWs",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>
        <MaintenanceBanner />
        <div id="app-root">
          <LanguageProvider>
            <HtmlLangSync />
            <VisitTracker />
            {children}
            <CookieConsent />
          </LanguageProvider>
        </div>
        <NoHorizontalScroll />
      </body>
    </html>
  );
}
