import type { MetadataRoute } from "next";

const SITE_URL = "https://www.vorzaiq.com";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://api.vorzaiq.com";

type VacancyItem = { id: number; created_at: string };
type LocationItem = { location: string; count: number };

function toSlug(location: string): string {
  return location
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
      url: `${SITE_URL}/banen`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/abonnementen`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/voorwaarden`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/verwerkersovereenkomst`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  let vacancyPages: MetadataRoute.Sitemap = [];
  let locationPages: MetadataRoute.Sitemap = [];

  try {
    const [vacRes, locRes] = await Promise.all([
      fetch(`${API_BASE}/vacancies?limit=500`, { next: { revalidate: 3600 } }),
      fetch(`${API_BASE}/vacancies/seo/locations`, {
        next: { revalidate: 3600 },
      }),
    ]);

    if (vacRes.ok) {
      const vacancies: VacancyItem[] = await vacRes.json();
      vacancyPages = vacancies.map((v) => ({
        url: `${SITE_URL}/vacatures/${v.id}`,
        lastModified: new Date(v.created_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }

    if (locRes.ok) {
      const locations: LocationItem[] = await locRes.json();
      locationPages = locations.map((l) => ({
        url: `${SITE_URL}/banen/${toSlug(l.location)}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.7,
      }));
    }
  } catch {
    // API unavailable — skip dynamic pages
  }

  return [...staticPages, ...vacancyPages, ...locationPages];
}
