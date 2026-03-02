"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listVacancies, PublicVacancy } from "@/lib/api";

const CATEGORIES = [
  { icon: "💻", label: "IT & Software",    count: 142 },
  { icon: "📊", label: "Finance",           count: 89  },
  { icon: "🎨", label: "Design",            count: 54  },
  { icon: "📱", label: "Marketing",         count: 98  },
  { icon: "🏗️", label: "Engineering",      count: 113 },
  { icon: "👥", label: "HR & Recruitment",  count: 45  },
];

const CARD_COLORS = [
  "bg-teal-500", "bg-blue-500", "bg-violet-500",
  "bg-pink-500", "bg-orange-500", "bg-emerald-500",
];
const getColor   = (id: number) => CARD_COLORS[id % CARD_COLORS.length];
const getInitials = (t: string) =>
  t.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");

export default function HomePage() {
  const [vacancies, setVacancies] = useState<PublicVacancy[]>([]);
  const [query,    setQuery]    = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    listVacancies().then(setVacancies).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (query)    p.set("q", query);
    if (location) p.set("location", location);
    window.location.href = `/vacatures?${p.toString()}`;
  };

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* ── HERO ── */}
      <section className="bg-white border-b border-gray-100 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
            AI-powered recruitment
          </div>

          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            Vind jouw perfecte baan<br />
            <span className="text-teal-600">met AI-matching</span>
          </h1>

          <p className="text-gray-500 text-base mb-8 max-w-md mx-auto leading-relaxed">
            Upload je CV en ontvang direct een persoonlijke matchscore voor elke vacature.
          </p>

          {/* Zoekbalk */}
          <form onSubmit={handleSearch} className="flex gap-2 bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm max-w-2xl mx-auto">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Functietitel of trefwoord..."
                className="w-full pl-9 pr-3 py-2.5 text-sm text-gray-800 bg-transparent focus:outline-none"
              />
            </div>
            <div className="w-40 relative border-l border-gray-200">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <input
                type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Stad of regio..."
                className="w-full pl-9 pr-3 py-2.5 text-sm text-gray-800 bg-transparent focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Zoeken
            </button>
          </form>

          {/* Stats */}
          <div className="flex justify-center gap-8 mt-8 text-sm text-gray-400">
            <span><strong className="text-gray-700">{vacancies.length > 0 ? `${vacancies.length}+` : "14.780+"}</strong> vacatures</span>
            <span><strong className="text-gray-700">200+</strong> bedrijven</span>
            <span><strong className="text-gray-700">5.000+</strong> kandidaten</span>
          </div>
        </div>
      </section>

      {/* ── CATEGORIEËN ── */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-5">Verken per categorie</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.label}
              href={`/vacatures?q=${encodeURIComponent(cat.label)}`}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 hover:border-teal-300 hover:shadow-sm transition-all no-underline text-center group"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-semibold text-gray-700 group-hover:text-teal-700 leading-tight">{cat.label}</span>
              <span className="text-xs text-gray-400">{cat.count}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── VACATURES ── */}
      <section className="max-w-5xl mx-auto px-6 pb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Nieuwste vacatures</h2>
          <Link href="/vacatures" className="text-sm font-semibold text-teal-600 hover:text-teal-700 no-underline">
            Alle vacatures →
          </Link>
        </div>

        <div className="space-y-2">
          {vacancies.length === 0
            ? [...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse flex gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))
            : vacancies.slice(0, 6).map(v => (
                <Link
                  key={v.id}
                  href={`/vacatures/${v.id}`}
                  className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 px-5 py-4 hover:border-teal-200 hover:shadow-sm transition-all no-underline group"
                >
                  <div className={`${getColor(v.id)} w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                    {getInitials(v.title)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 group-hover:text-teal-700 transition-colors">{v.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{v.location || "Locatie onbekend"}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {v.salary_range && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 font-medium border border-gray-200">
                        {v.salary_range}
                      </span>
                    )}
                    {v.hours_per_week && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 font-medium">
                        {v.hours_per_week}u
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(v.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </Link>
              ))
          }
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-teal-600 rounded-2xl px-10 py-10 flex items-center justify-between gap-8">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Klaar om te solliciteren?</h2>
            <p className="text-teal-100 text-sm leading-relaxed max-w-sm">
              Maak een gratis account, upload je CV en ontvang AI-matches op maat.
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link
              href="/candidate/login"
              className="bg-white text-teal-700 hover:bg-gray-50 px-6 py-3 rounded-xl text-sm font-bold no-underline transition-colors"
            >
              Start gratis
            </Link>
            <Link
              href="/vacatures"
              className="bg-teal-500 hover:bg-teal-400 text-white px-6 py-3 rounded-xl text-sm font-semibold no-underline transition-colors"
            >
              Bekijk vacatures
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
