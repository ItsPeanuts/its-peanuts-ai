import type { Metadata } from "next";
import VacaturesClient from "./VacaturesClient";

export const metadata: Metadata = {
  title: "Alle Vacatures | VorzaIQ — AI Recruitment Nederland",
  description:
    "Bekijk alle openstaande vacatures. Upload je CV en ontvang automatisch AI-matches op maat.",
};

export default function VacaturesPage() {
  return <VacaturesClient />;
}
