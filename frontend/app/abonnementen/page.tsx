import type { Metadata } from "next";
import AbonnementenClient from "./AbonnementenClient";

export const metadata: Metadata = {
  title: "Abonnementen — Vind sneller personeel met AI",
  description:
    "Bekijk de plannen van VorzaIQ. AI-recruiter Lisa interviewt je kandidaten automatisch en kandidaten matchen hun CV in één klik tegen jouw vacatures. Voor MKB in Nederland.",
  alternates: { canonical: "https://www.vorzaiq.com/abonnementen" },
  openGraph: {
    title: "Abonnementen — Vind sneller personeel met AI | VorzaIQ",
    description:
      "AI-recruiter Lisa doet de eerste interviews. Kandidaten matchen met 1 knop. Plannen voor MKB.",
    url: "https://www.vorzaiq.com/abonnementen",
  },
};

export default function AbonnementenPage() {
  return <AbonnementenClient />;
}
