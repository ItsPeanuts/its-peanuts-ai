import type { MetadataRoute } from "next";

const SITE_URL = "https://www.vorzaiq.com";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://api.vorzaiq.com";

type VacancyItem = { id: number; created_at: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/vacatures`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/abonnementen`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Dynamic vacancy pages
  let vacancyPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_BASE}/vacancies?limit=500`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const vacancies: VacancyItem[] = await res.json();
      vacancyPages = vacancies.map((v) => ({
        url: `${SITE_URL}/vacatures/${v.id}`,
        lastModified: new Date(v.created_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch {
    // API unavailable — skip dynamic pages
  }

  return [...staticPages, ...vacancyPages];
}
