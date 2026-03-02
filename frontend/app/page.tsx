"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listVacancies, PublicVacancy } from "@/lib/api";

const CATEGORIES = [
  { icon: "💻", label: "IT & Software",   count: 142 },
  { icon: "📊", label: "Finance",          count: 89  },
  { icon: "🏥", label: "Healthcare",       count: 67  },
  { icon: "🎨", label: "Design",           count: 54  },
  { icon: "📱", label: "Marketing",        count: 98  },
  { icon: "🏗️", label: "Engineering",     count: 113 },
  { icon: "📦", label: "Logistics",        count: 76  },
  { icon: "👥", label: "HR & Recruitment", count: 45  },
];

const COMPANIES = [
  { name: "Google",    abbr: "GG", bg: "bg-blue-50",   color: "text-blue-700" },
  { name: "Microsoft", abbr: "MS", bg: "bg-sky-50",    color: "text-sky-700"  },
  { name: "Coolblue",  abbr: "CB", bg: "bg-blue-50",   color: "text-blue-800" },
  { name: "Booking",   abbr: "BK", bg: "bg-cyan-50",   color: "text-cyan-700" },
  { name: "ASML",      abbr: "AS", bg: "bg-green-50",  color: "text-green-700"},
  { name: "Philips",   abbr: "PH", bg: "bg-indigo-50", color: "text-indigo-700"},
];

const ARTICLES = [
  { tag: "Carrière tips",  title: "Hoe AI je sollicitatie naar het volgende niveau tilt",      excerpt: "Ontdek hoe kunstmatige intelligentie je helpt de perfecte baan te vinden.",       accent: "bg-teal-500"   },
  { tag: "CV schrijven",   title: "5 dingen die recruiters zien voordat ze je CV lezen",        excerpt: "Kleine details maken het verschil. De meest gemaakte fouten op een rij.",          accent: "bg-orange-500" },
  { tag: "Interview prep", title: "Veelgestelde interviewvragen & hoe je ze beantwoordt",       excerpt: "Bereid je voor op elk interview met bewezen antwoordstrategieën.",                 accent: "bg-violet-500" },
];

const CARD_COLORS = ["bg-teal-500","bg-blue-500","bg-violet-500","bg-pink-500","bg-orange-500","bg-emerald-500","bg-indigo-500","bg-red-500"];
const getColor = (id: number) => CARD_COLORS[id % CARD_COLORS.length];
const getInitials = (t: string) => t.split(" ").slice(0,2).map(w => w[0]?.toUpperCase() ?? "").join("");

export default function HomePage() {
  const [vacancies, setVacancies] = useState<PublicVacancy[]>([]);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => { listVacancies().then(setVacancies).catch(() => {}); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (query)    p.set("q", query);
    if (location) p.set("location", location);
    window.location.href = `/vacatures?${p.toString()}`;
  };

  return (
    <div>

      {/* ══ HERO ══ */}
      <section className="relative overflow-hidden py-20" style={{ background: "linear-gradient(135deg, #0D1B38 0%, #102347 50%, #0D1B38 100%)" }}>
        {/* decoratieve cirkels */}
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(13,168,158,0.15) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)" }} />

        <div className="relative z-10 max-w-6xl mx-auto px-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-green-300 text-xs font-semibold">AI-powered recruitment platform</span>
          </div>

          {/* Titel */}
          <h1 className="text-5xl font-extrabold text-white leading-tight mb-4" style={{ letterSpacing: "-1px" }}>
            <span className="text-teal-300">
              {vacancies.length > 0 ? vacancies.length.toLocaleString("nl-NL") : "14.780"}
            </span>{" "}
            Vacatures<br />Voor Jou
          </h1>
          <p className="text-slate-400 text-base mb-8 max-w-lg leading-relaxed">
            Vind jouw perfecte baan met AI-matching. Upload je CV en ontvang direct een persoonlijke matchscore.
          </p>

          {/* Zoekbalk */}
          <form onSubmit={handleSearch} className="flex gap-2 bg-white rounded-xl p-1.5 max-w-2xl shadow-2xl">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Functietitel, trefwoord..."
                className="w-full pl-9 pr-3 py-3 text-sm text-gray-800 bg-transparent focus:outline-none"
              />
            </div>
            <div className="w-44 relative border-l border-gray-200">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <input
                type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Locatie..."
                className="w-full pl-9 pr-3 py-3 text-sm text-gray-800 bg-transparent focus:outline-none"
              />
            </div>
            <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg text-sm font-bold transition-colors whitespace-nowrap">
              Zoeken
            </button>
          </form>

          {/* Stats */}
          <div className="flex gap-8 mt-7">
            {[
              { n: vacancies.length > 0 ? `${vacancies.length}+` : "14.780+", label: "Vacatures" },
              { n: "200+", label: "Bedrijven" },
              { n: "5.000+", label: "Kandidaten" },
            ].map(s => (
              <div key={s.label}>
                <div className="text-2xl font-extrabold text-white">{s.n}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CATEGORIEËN ══ */}
      <section className="bg-white py-14 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Verken meer vacatures</h2>
              <p className="text-sm text-gray-500 mt-1">Kies een categorie die bij je past</p>
            </div>
            <Link href="/vacatures" className="text-sm font-bold text-teal-600 hover:text-teal-700 no-underline">
              Alle categorieën →
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.label}
                href={`/vacatures?q=${encodeURIComponent(cat.label)}`}
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-teal-300 hover:shadow-sm transition-all no-underline group"
              >
                <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-teal-50 transition-colors">
                  {cat.icon}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{cat.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{cat.count} vacatures</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ LAATSTE VACATURES ══ */}
      <section className="bg-gray-50 py-14">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Laatste vacatures</h2>
              <p className="text-sm text-gray-500 mt-1">Vers binnen — solliciteer als eerste</p>
            </div>
            <Link href="/vacatures" className="text-sm font-bold text-teal-600 hover:text-teal-700 no-underline">
              Alle vacatures →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {vacancies.length === 0
              ? [...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                        <div className="h-3 bg-gray-100 rounded w-1/3" />
                      </div>
                    </div>
                  </div>
                ))
              : vacancies.slice(0, 6).map(v => (
                  <Link
                    key={v.id}
                    href={`/vacatures/${v.id}`}
                    className="flex gap-4 items-start bg-white rounded-xl border border-gray-100 p-5 hover:border-teal-200 hover:shadow-sm transition-all no-underline group"
                  >
                    <div className={`${getColor(v.id)} w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                      {getInitials(v.title)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-sm group-hover:text-teal-700 transition-colors">{v.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{v.location || "Locatie onbekend"}</div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {v.hours_per_week && <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">{v.hours_per_week}u</span>}
                        {v.salary_range   && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">{v.salary_range}</span>}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(v.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                    </div>
                  </Link>
                ))
            }
          </div>
        </div>
      </section>

      {/* ══ TOP BEDRIJVEN ══ */}
      <section className="bg-white py-14 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-8">
          <div className="mb-8">
            <h2 className="text-xl font-extrabold text-gray-900">Top bedrijven</h2>
            <p className="text-sm text-gray-500 mt-1">Werken bij de beste werkgevers</p>
          </div>
          <div className="grid grid-cols-6 gap-4">
            {COMPANIES.map(c => (
              <div
                key={c.name}
                className="flex flex-col items-center py-5 px-3 rounded-xl border border-gray-100 hover:border-teal-200 hover:shadow-sm cursor-pointer transition-all"
              >
                <div className={`w-13 h-13 w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center text-sm font-extrabold ${c.color} mb-3`}>
                  {c.abbr}
                </div>
                <span className="text-xs font-semibold text-gray-700">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA BANNER ══ */}
      <section className="relative overflow-hidden py-16" style={{ background: "linear-gradient(135deg, #0DA89E 0%, #0891B2 100%)" }}>
        <div className="absolute right-20 -top-16 w-72 h-72 rounded-full border-2 border-white/15" />
        <div className="absolute right-40 -bottom-10 w-48 h-48 rounded-full border-2 border-white/10" />

        <div className="relative z-10 max-w-6xl mx-auto px-8 flex items-center justify-between gap-12">
          <div className="max-w-xl">
            <h2 className="text-3xl font-extrabold text-white mb-3 leading-snug">Bouw een sterk profiel</h2>
            <p className="text-teal-100 text-sm leading-relaxed mb-7">
              Upload je CV, laat AI je profiel optimaliseren en maak indruk op recruiters — nog vóór het eerste gesprek.
            </p>
            <div className="flex gap-3">
              <Link href="/candidate/login" className="bg-orange-500 hover:bg-orange-600 text-white px-7 py-3 rounded-xl text-sm font-bold no-underline transition-colors">
                Start gratis
              </Link>
              <Link href="/vacatures" className="bg-white/15 hover:bg-white/25 text-white px-7 py-3 rounded-xl text-sm font-semibold no-underline transition-colors">
                Bekijk vacatures
              </Link>
            </div>
          </div>

          {/* Decoratieve AI match bars */}
          <div className="hidden lg:flex items-end gap-2.5 opacity-90">
            {[{ h: 56, s: 85 }, { h: 72, s: 92 }, { h: 48, s: 78 }, { h: 80, s: 96 }, { h: 60, s: 88 }].map((b, i) => (
              <div key={i} className="text-center">
                <div className="text-xs text-white/90 font-bold mb-1">{b.s}%</div>
                <div className="w-8 rounded-t bg-white/30" style={{ height: b.h }} />
              </div>
            ))}
            <div className="text-xs text-white/60 ml-2 leading-snug">AI<br/>match</div>
          </div>
        </div>
      </section>

      {/* ══ ARTIKELEN ══ */}
      <section className="bg-gray-50 py-14">
        <div className="max-w-6xl mx-auto px-8">
          <div className="mb-8">
            <h2 className="text-xl font-extrabold text-gray-900">Career advies van HR-experts</h2>
            <p className="text-sm text-gray-500 mt-1">Tips en inzichten om verder te komen</p>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {ARTICLES.map(a => (
              <div key={a.title} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer group">
                <div className={`${a.accent} h-36 flex items-center justify-center relative overflow-hidden`}>
                  <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-white/15" />
                  <span className="bg-white/20 text-white text-xs font-bold px-4 py-1.5 rounded-full relative z-10">
                    {a.tag}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-2 leading-snug group-hover:text-teal-700 transition-colors">{a.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">{a.excerpt}</p>
                  <span className="text-xs font-bold text-teal-600">Lees meer →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
