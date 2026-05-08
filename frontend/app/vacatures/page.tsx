import type { Metadata } from "next";
import VacaturesClient from "./VacaturesClient";

export const metadata: Metadata = {
  title: "Alle Vacatures",
  description:
    "Bekijk alle openstaande vacatures. Upload je CV één keer en ontvang automatisch AI-matches op maat.",
  alternates: { canonical: "https://www.vorzaiq.com/vacatures" },
  openGraph: {
    title: "Alle Vacatures | VorzaIQ",
    description:
      "Bekijk alle openstaande vacatures. Upload je CV één keer en match met 1 knop.",
    url: "https://www.vorzaiq.com/vacatures",
  },
};

export default function VacaturesPage() {
  return <VacaturesClient />;
}
