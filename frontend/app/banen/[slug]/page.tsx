import type { Metadata } from "next";
import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://api.vorzaiq.com";
const SITE_URL = "https://www.vorzaiq.com";

type VacancyItem = {
  id: number;
  title: string;
  location: string | null;
  salary_range: string | null;
  hours_per_week: string | null;
  employment_type: string | null;
  employer_name: string | null;
  created_at: string;
};

type LocationItem = { location: string; count: number };

function slugToLocation(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function findLocationName(slug: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/vacancies/seo/locations`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return slugToLocation(slug);
    const locations: LocationItem[] = await res.json();
    const match = locations.find(
      (l) =>
        l.location
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") === slug
    );
    return match?.location || slugToLocation(slug);
  } catch {
    return slugToLocation(slug);
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const location = await findLocationName(params.slug);
  const title = `Vacatures in ${location} — Werk zoeken | VorzaIQ`;
  const description = `Bekijk alle vacatures in ${location}. Vind werk en solliciteer direct met AI-matching. Openstaande functies in ${location} en omgeving.`;
  const url = `${SITE_URL}/banen/${params.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
    },
  };
}

export default async function BanenSlugPage({
  params,
}: {
  params: { slug: string };
}) {
  const location = await findLocationName(params.slug);
  let vacancies: VacancyItem[] = [];

  try {
    const res = await fetch(
      `${API_BASE}/vacancies?location=${encodeURIComponent(location)}&limit=50`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) vacancies = await res.json();
  } catch {
    // API unavailable
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Vacatures in ${location}`,
    description: `Alle openstaande vacatures in ${location}`,
    numberOfItems: vacancies.length,
    itemListElement: vacancies.map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/vacatures/${v.id}`,
      name: v.title,
    })),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold text-purple-700 no-underline"
          >
            VorzaIQ
          </Link>
          <div className="flex gap-4 text-sm">
            <Link
              href="/vacatures"
              className="text-gray-600 hover:text-purple-600 no-underline"
            >
              Alle vacatures
            </Link>
            <Link
              href="/candidate/login"
              className="text-purple-600 font-semibold no-underline"
            >
              Inloggen
            </Link>
          </div>
        </div>
      </nav>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link
            href="/"
            className="hover:text-purple-600 no-underline transition-colors"
          >
            Home
          </Link>
          <span>/</span>
          <Link
            href="/banen"
            className="hover:text-purple-600 no-underline transition-colors"
          >
            Banen
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{location}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Vacatures in {location}
        </h1>
        <p className="text-gray-600 mb-8 max-w-2xl">
          {vacancies.length > 0
            ? `Er ${vacancies.length === 1 ? "is" : "zijn"} ${vacancies.length} vacature${vacancies.length !== 1 ? "s" : ""} beschikbaar in ${location}. Solliciteer direct en ontvang een AI-match.`
            : `Er zijn momenteel geen vacatures in ${location}. Bekijk alle vacatures of upload je CV voor automatische matches.`}
        </p>

        {vacancies.length > 0 ? (
          <div className="space-y-3">
            {vacancies.map((v) => (
              <Link
                key={v.id}
                href={`/vacatures/${v.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-5 hover:border-purple-300 hover:shadow-sm transition-all no-underline"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {v.title}
                    </h2>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                      {v.employer_name && <span>{v.employer_name}</span>}
                      {v.location && (
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                          </svg>
                          {v.location}
                        </span>
                      )}
                      {v.hours_per_week && (
                        <span>{v.hours_per_week} uur/week</span>
                      )}
                      {v.salary_range && <span>{v.salary_range}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-purple-600 font-medium bg-purple-50 px-3 py-1.5 rounded-full whitespace-nowrap mt-1">
                    Bekijk &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-500 mb-4">
              Geen vacatures gevonden in {location}.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/vacatures"
                className="text-sm font-semibold text-purple-600 no-underline"
              >
                Alle vacatures bekijken
              </Link>
              <Link
                href="/candidate/login"
                className="text-sm font-semibold text-white bg-purple-600 px-4 py-2 rounded-lg no-underline hover:bg-purple-700 transition-colors"
              >
                CV uploaden voor matches
              </Link>
            </div>
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Andere steden
          </h2>
          <div className="text-sm text-gray-600">
            Bekijk ook vacatures in andere steden op onze{" "}
            <Link
              href="/banen"
              className="text-purple-600 font-semibold no-underline"
            >
              overzichtspagina
            </Link>
            .
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
