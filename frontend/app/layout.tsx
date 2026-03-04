import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "It's Peanuts AI — Slim solliciteren & slim werven",
  description: "AI-powered recruitment platform voor kandidaten en werkgevers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
