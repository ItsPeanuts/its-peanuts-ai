import type { Metadata } from "next";
import "./globals.css";
import OverflowDebug from "@/components/OverflowDebug";

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
        <div id="app-root">{children}</div>
        <OverflowDebug />
      </body>
    </html>
  );
}
