import type { Metadata } from "next";
import VacatureDetailClient from "./VacatureDetailClient";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://its-peanuts-backend.onrender.com";

type VacancyMeta = {
  title: string;
  location: string | null;
  description: string | null;
};

async function fetchVacancyMeta(id: string): Promise<VacancyMeta | null> {
  try {
    const res = await fetch(`${API_BASE}/vacancies/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const vacancy = await fetchVacancyMeta(params.id);

  if (!vacancy) {
    return {
      title: "Vacature | VorzaIQ",
      description: "Bekijk deze vacature op VorzaIQ en solliciteer direct.",
    };
  }

  const city = vacancy.location || "Nederland";
  const title = `${vacancy.title} — ${city} | VorzaIQ`;
  const description = `Bekijk de vacature voor ${vacancy.title} in ${city}. Solliciteer direct en word benaderd door Lisa, onze AI-recruiter.`;
  const url = `https://www.vorzaiq.com/vacatures/${params.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "article",
    },
  };
}

export default function VacatureDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <VacatureDetailClient id={params.id} />;
}
