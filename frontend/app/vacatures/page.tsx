"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listVacancies, PublicVacancy } from "@/lib/api";

const CATEGORIES = ["Alle", "IT & Software", "Finance", "Marketing", "Design", "Engineering", "HR"];
const JOB_TYPES = [
  { label: "Fulltime", value: "fulltime" },
  { label: "Parttime", value: "parttime" },
  { label: "Freelance / Flex", value: "flex" },
];

const AVATAR_COLORS = ["bg-teal-500", "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-green-500", "bg-indigo-500", "bg-red-500"];
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }
function getInitials(title: string) {
  return title.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

// Mock data for demo when API is unavailable
const MOCK_VACANCIES: PublicVacancy[] = [
  { id: 1, title: "Senior Frontend Developer", location: "Amsterdam", hours_per_week: "40", salary_range: "€4.500 - €6.000", description: "Bouw mooie React applicaties voor miljoenen gebruikers. Je werkt in een multidisciplinair team.", created_at: "2026-02-20T10:00:00" },
  { id: 2, title: "Product Manager", location: "Rotterdam", hours_per_week: "40", salary_range: "€5.000 - €7.000", description: "Leid productontwikkeling van concept tot lancering. Jij verbindt techniek, design en business.", created_at: "2026-02-19T09:00:00" },
  { id: 3, title: "Data Scientist", location: "Utrecht", hours_per_week: "32", salary_range: "€4.000 - €5.500", description: "Analyseer grote datasets en bouw ML-modellen voor ons AI-platform.", created_at: "2026-02-18T14:00:00" },
  { id: 4, title: "UX/UI Designer", location: "Den Haag", hours_per_week: "40", salary_range: "€3.500 - €5.000", description: "Ontwerp gebruiksvriendelijke interfaces die klanten blij maken.", created_at: "2026-02-17T11:00:00" },
  { id: 5, title: "DevOps Engineer", location: "Amsterdam", hours_per_week: "40", salary_range: "€5.500 - €7.500", description: "Beheer onze cloud-infrastructuur en automatiseer deploymentprocessen.", created_at: "2026-02-16T08:00:00" },
  { id: 6, title: "Marketing Manager", location: "Eindhoven", hours_per_week: "32", salary_range: "€3.800 - €5.200", description: "Ontwikkel en voer marketingstrategieën uit voor onze groeiende merken.", created_at: "2026-02-15T13:00:00" },
];

function JobCard({ vacancy }: { vacancy: PublicVacancy }) {
  const color = avatarColor(vacancy.id);
  const initials = getInitials(vacancy.title);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-teal-200 transition-all group">
      <div className="flex gap-4 items-start">
        <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-teal-600 transition-colors">
                {vacancy.title}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {vacancy.location || "Locatie onbekend"}
              </p>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {new Date(vacancy.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {vacancy.hours_per_week && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">
                {vacancy.hours_per_week}u/week
              </span>
            )}
            {vacancy.salary_range && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                {vacancy.salary_range}
              </span>
            )}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
              AI-matching
            </span>
          </div>

          {vacancy.description && (
            <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
              {vacancy.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
        <Link
          href={`/vacatures/${vacancy.id}`}
          className="text-xs font-semibold text-gray-500 hover:text-gray-700 no-underline transition-colors"
        >
          Meer info
        </Link>
        <Link
          href={`/vacatures/${vacancy.id}/solliciteer`}
          className="px-4 py-1.5 rounded-lg text-xs font-bold text-white no-underline transition-all hover:opacity-90"
          style={{ background: "#f97316" }}
        >
          Apply Now
        </Link>
      </div>
    </div>
  );
}

export default function VacaturesPage() {
  const [vacancies, setVacancies] = useState<PublicVacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [activeCategory, setActiveCategory] = useState("Alle");
  const [jobTypes, setJobTypes] = useState<string[]>([]);

  const load = useCallback(async (q?: string, loc?: string) => {
    setLoading(true);
    try {
      const data = await listVacancies({ q, location: loc });
      setVacancies(data.length > 0 ? data : MOCK_VACANCIES);
    } catch {
      // Show mock data when API is unavailable
      setVacancies(MOCK_VACANCIES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(query || undefined, location || undefined);
  };

  const toggleType = (val: string) =>
    setJobTypes((p) => p.includes(val) ? p.filter((v) => v !== val) : [...p, val]);

  const filtered = vacancies.filter((v) => {
    if (jobTypes.length === 0) return true;
    const h = parseInt(v.hours_per_week ?? "0");
    return jobTypes.some((f) => {
      if (f === "fulltime") return h >= 32;
      if (f === "parttime") return h > 0 && h < 32;
      if (f === "flex") return isNaN(h) || h === 0;
      return true;
    });
  });

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Search header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Zoek vacatures</h1>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Functie, trefwoord, bedrijf..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition" />
            </div>
            <div className="w-52 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="Stad, regio..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition" />
            </div>
            <button type="submit" className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors hover:opacity-90"
              style={{ background: "#f97316" }}>
              Vacature vinden
            </button>
          </form>

          {/* Category tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  activeCategory === cat
                    ? "text-white border-teal-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-teal-300 hover:text-teal-600"
                }`}
                style={activeCategory === cat ? { background: "#0DA89E", borderColor: "#0DA89E" } : {}}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-7">

        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-24">
            <h3 className="font-semibold text-gray-900 text-sm mb-5">Filters</h3>

            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Type werk</p>
              <div className="space-y-2.5">
                {JOB_TYPES.map((t) => (
                  <label key={t.value} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={jobTypes.includes(t.value)} onChange={() => toggleType(t.value)}
                      className="w-4 h-4 rounded border-gray-300 accent-teal-600" />
                    <span className="text-sm text-gray-600">{t.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {(jobTypes.length > 0 || query || location) && (
              <button onClick={() => { setJobTypes([]); setQuery(""); setLocation(""); load(); }}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                ✕ Filters wissen
              </button>
            )}
          </div>
        </aside>

        {/* Resultaten */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {loading ? "Laden..." : (
                <><span className="font-semibold text-gray-900">{filtered.length}</span> vacature{filtered.length !== 1 ? "s" : ""} gevonden</>
              )}
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-semibold text-gray-700 mb-1">Geen vacatures gevonden</p>
              <p className="text-sm text-gray-400">Pas je zoekfilters aan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((v) => <JobCard key={v.id} vacancy={v} />)}
            </div>
          )}

          {/* Complete your profile banner */}
          {!loading && filtered.length > 0 && (
            <div className="mt-8 rounded-xl p-6 text-white relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #0DA89E 0%, #0891b2 100%)" }}>
              <div className="absolute right-0 top-0 bottom-0 w-32 opacity-20"
                style={{ background: "radial-gradient(circle, white 0%, transparent 70%)", transform: "translate(30%, -20%)" }} />
              <h3 className="font-bold text-lg mb-1">Maak je profiel compleet</h3>
              <p className="text-teal-100 text-sm mb-4">Upload je CV en ontvang automatisch AI-matches voor jou.</p>
              <Link href="/candidate/login"
                className="inline-block px-5 py-2 rounded-lg text-sm font-bold no-underline transition-all hover:opacity-90"
                style={{ background: "#f97316", color: "white" }}>
                Start nu
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
