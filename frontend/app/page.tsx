import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "VorzaIQ — AI Recruitment Platform | Nederland",
  description:
    "Upload je CV en ontvang direct AI-matches. Werkgevers: vind kandidaten sneller met Lisa, onze AI-recruiter.",
  alternates: { canonical: "https://www.vorzaiq.com" },
  openGraph: {
    title: "VorzaIQ — AI Recruitment Platform | Nederland",
    description:
      "Upload je CV en ontvang direct AI-matches. Werkgevers: vind kandidaten sneller met Lisa, onze AI-recruiter.",
    url: "https://www.vorzaiq.com",
    type: "website",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
