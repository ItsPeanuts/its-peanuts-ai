import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Vacatures in Nederland, direct gematcht op je CV",
  description:
    "Upload je CV en ontvang direct een AI-matchscore op elke vacature. Werkgevers: AI-recruiter Lisa screent je sollicitanten automatisch, dag en nacht.",
  alternates: { canonical: "https://www.vorzaiq.com" },
  openGraph: {
    title: "VorzaIQ — Vacatures in Nederland, direct gematcht op je CV",
    description:
      "Upload je CV en ontvang direct een AI-matchscore op elke vacature. Werkgevers: AI-recruiter Lisa screent je sollicitanten automatisch.",
    url: "https://www.vorzaiq.com",
    type: "website",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
