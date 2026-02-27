"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listVacancies, PublicVacancy } from "@/lib/api";

const HOURS_OPTIONS = [
  { label: "Fulltime (32-40u)", value: "fulltime" },
  { label: "Parttime (<32u)", value: "parttime" },
  { label: "Oproep / Flex", value: "flex" },
];

function getInitials(title: string) {
  return title
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_COLORS = [
  "bg-teal-500", "bg-blue-500", "bg-purple-500", "bg-pink-500",
  "bg-orange-500", "bg-green-500", "bg-indigo-500", "bg-red-500",
];

function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function JobCard({ vacancy }: { vacancy: PublicVacancy }) {
  const initials = getInitials(vacancy.title);
  const color = avatarColor(vacancy.id);

  return (
    <Link
      href={`/vacatures/${vacancy.id}`}
      className="block bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-primary/30 transition-all group no-underline"
    >
      <div className="flex gap-4 items-start">
        {/* Logo placeholder */}
        <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900 text-base group-hover:text-primary transition-colors leading-snug">
                {vacancy.title}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {vacancy.location || "Locatie onbekend"}
              </p>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
              {new Date(vacancy.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-3">
            {vacancy.hours_per_week && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                {vacancy.hours_per_week} uur/week
              </span>
            )}
            {vacancy.salary_range && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                {vacancy.salary_range}
              </span>
            )}
          </div>

          {/* Beschrijving preview */}
          {vacancy.description && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">
              {vacancy.description}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
        <span className="text-xs text-gray-400">AI-matching beschikbaar</span>
        <span className="text-xs font-semibold text-primary group-hover:underline">
          Bekijk vacature →
        </span>
      </div>
    </Link>
  );
}

export default function VacaturesPage() {
  const [vacancies, setVacancies] = useState<PublicVacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [hoursFilter, setHoursFilter] = useState<string[]>([]);

  const load = useCallback(async (q?: string, loc?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listVacancies({ q, location: loc });
      setVacancies(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Kon vacatures niet laden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(query || undefined, location || undefined);
  };

  const toggleHours = (val: string) => {
    setHoursFilter((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const filtered = vacancies.filter((v) => {
    if (hoursFilter.length === 0) return true;
    const hours = (v.hours_per_week ?? "").toLowerCase();
    return hoursFilter.some((f) => {
      if (f === "fulltime") return parseInt(hours) >= 32;
      if (f === "parttime") return parseInt(hours) < 32 && parseInt(hours) > 0;
      if (f === "flex") return isNaN(parseInt(hours)) && hours.length > 0;
      return true;
    });
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero zoekbalk */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Zoek vacatures</h1>
          <p className="text-gray-500 text-sm mb-5">Vind jouw perfecte baan met AI-matching</p>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Functie, trefwoord..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
            <div className="w-56 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Locatie..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
            >
              Zoeken
            </button>
          </form>
        </div>
      </div>

      {/* Content: sidebar + resultaten */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-7">
          {/* Sidebar */}
          <aside className="w-60 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-24">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Filters</h3>

              {/* Uren per week */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Werkweek
                </p>
                <div className="space-y-2">
                  {HOURS_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={hoursFilter.includes(opt.value)}
                        onChange={() => toggleHours(opt.value)}
                        className="w-4 h-4 rounded border-gray-300 accent-[#0DA89E]"
                      />
                      <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Reset */}
              {(hoursFilter.length > 0 || query || location) && (
                <button
                  onClick={() => {
                    setHoursFilter([]);
                    setQuery("");
                    setLocation("");
                    load();
                  }}
                  className="w-full text-xs text-gray-500 hover:text-primary transition-colors text-left mt-2"
                >
                  ✕ Filters wissen
                </button>
              )}
            </div>
          </aside>

          {/* Resultaten */}
          <main className="flex-1 min-w-0">
            {/* Teller */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {loading ? (
                  <span>Laden...</span>
                ) : (
                  <span>
                    <span className="font-semibold text-gray-900">{filtered.length}</span>{" "}
                    vacature{filtered.length !== 1 ? "s" : ""} gevonden
                  </span>
                )}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">
                {error}
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                        <div className="h-3 bg-gray-100 rounded w-full mt-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="font-semibold text-gray-700 mb-1">Geen vacatures gevonden</p>
                <p className="text-sm text-gray-400">Probeer een andere zoekopdracht of verwijder filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((vacancy) => (
                  <JobCard key={vacancy.id} vacancy={vacancy} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
