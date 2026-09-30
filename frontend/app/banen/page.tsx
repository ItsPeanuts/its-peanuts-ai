import type { Metadata } from "next";
import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://api.vorzaiq.com";
const SITE_URL = "https://www.vorzaiq.com";

export const metadata: Metadata = {
  title: "Vacatures per stad — Werk zoeken in Nederland",
  description:
    "Bekijk alle vacatures per stad in Nederland. Vind werk in Amsterdam, Rotterdam, Utrecht, Den Haag en meer. Solliciteer direct met AI-matching.",
  alternates: { canonical: `${SITE_URL}/banen` },
  openGraph: {
    title: "Vacatures per stad — Werk zoeken in Nederland",
    description:
      "Bekijk alle vacatures per stad. Solliciteer direct met AI-matching.",
    url: `${SITE_URL}/banen`,
  },
};

type LocationItem = { location: string; count: number };
type VacancyItem = {
  id: number;
  title: string;
  location: string | null;
  employer_name: string | null;
  created_at: string;
};

function toSlug(location: string): string {
  return location
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default async function BanenPage() {
  let locations: LocationItem[] = [];
  let recentVacancies: VacancyItem[] = [];

  try {
    const [locRes, vacRes] = await Promise.all([
      fetch(`${API_BASE}/vacancies/seo/locations`, {
        next: { revalidate: 3600 },
      }),
      fetch(`${API_BASE}/vacancies?limit=10`, { next: { revalidate: 3600 } }),
    ]);
    if (locRes.ok) locations = await locRes.json();
    if (vacRes.ok) recentVacancies = await vacRes.json();
  } catch {
    // API unavailable
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Vacatures per stad
        </h1>
        <p className="text-gray-600 mb-8 max-w-2xl">
          Zoek vacatures bij jou in de buurt. Kies een stad en bekijk alle
          openstaande functies. Solliciteer direct en ontvang een AI-match.
        </p>

        {locations.length > 0 && (
          <div className="mb-12">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Steden met vacatures
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {locations.map((loc) => (
                <Link
                  key={loc.location}
                  href={`/banen/${toSlug(loc.location)}`}
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:border-purple-300 hover:shadow-sm transition-all no-underline group"
                >
                  <div className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                    {loc.location}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {loc.count} vacature{loc.count !== 1 ? "s" : ""}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {recentVacancies.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Nieuwste vacatures
            </h2>
            <div className="space-y-3">
              {recentVacancies.map((v) => (
                <Link
                  key={v.id}
                  href={`/vacatures/${v.id}`}
                  className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-purple-300 hover:shadow-sm transition-all no-underline"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {v.title}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {v.employer_name && (
                          <span>{v.employer_name} · </span>
                        )}
                        {v.location || "Nederland"}
                      </div>
                    </div>
                    <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2.5 py-1 rounded-full">
                      Solliciteer
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {locations.length === 0 && recentVacancies.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg mb-4">
              Er zijn momenteel geen vacatures beschikbaar.
            </p>
            <Link
              href="/"
              className="text-purple-600 font-semibold no-underline"
            >
              Terug naar home
            </Link>
          </div>
        )}
      </div>

      <PublicFooter />
    </div>
  );
}
