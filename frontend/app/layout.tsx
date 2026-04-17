import type { Metadata } from "next";
import "./globals.css";
import NoHorizontalScroll from "@/components/NoHorizontalScroll";
import MaintenanceBanner from "@/components/MaintenanceBanner";
import { LanguageProvider } from "@/lib/i18n";
import HtmlLangSync from "@/components/HtmlLangSync";
import VisitTracker from "@/components/VisitTracker";
import CookieConsent from "@/components/CookieConsent";

export const metadata: Metadata = {
  title: "VorzaIQ — The Smart Way to Hire",
  description: "Find smarter. Hire faster. AI-powered recruitment platform voor kandidaten en werkgevers.",
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
