import type { Metadata } from "next";
import VacaturesClient from "./VacaturesClient";

export const metadata: Metadata = {
  title: "Vacatures in Nederland",
  description:
    "Bekijk alle openstaande vacatures in Nederland. Upload je CV, ontvang direct een AI-matchscore en solliciteer met een klik.",
  alternates: { canonical: "https://www.vorzaiq.com/vacatures" },
  openGraph: {
    title: "Vacatures in Nederland | VorzaIQ",
    description:
      "Bekijk alle openstaande vacatures in Nederland. Upload je CV, ontvang direct een AI-matchscore en solliciteer met een klik.",
    url: "https://www.vorzaiq.com/vacatures",
  },
};

export default function VacaturesPage() {
  return <VacaturesClient />;
}
