"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listVacancies, PublicVacancy } from "@/lib/api";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

const CATEGORIES = [
  "IT & Software", "Finance", "Design", "Marketing", "Engineering", "HR",
];

const CARD_COLORS = [
  "#7C3AED", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#059669",
];
const getColor    = (id: number) => CARD_COLORS[id % CARD_COLORS.length];
const getInitials = (t: string)  =>
  t.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");

export default function HomePage() {
  const [vacancies, setVacancies] = useState<PublicVacancy[]>([]);
  const [query,     setQuery]     = useState("");
  const [location,  setLocation]  = useState("");

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
    <div style={{ overflowX: "hidden" }}>
      <PublicNav />

      {/* ── HERO ── */}
      <section className="hero-section bg-white py-20 border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6" style={{ textAlign: "center" }}>

          <p className="text-sm font-medium text-purple-700 mb-4">
            AI-powered recruitment platform
          </p>

          <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
            Vind jouw perfecte baan
          </h1>
          <p className="text-gray-500 text-base mb-8 leading-relaxed">
            Upload je CV en ontvang direct een AI-matchscore voor elke vacature.
          </p>

          {/* Zoekbalk */}
          <form onSubmit={handleSearch} className="hero-search-form" style={{ display: "flex", gap: 8, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 6, maxWidth: 560, margin: "0 auto", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Functietitel of trefwoord..."
              className="hero-search-input"
              style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#111827", padding: "8px 12px", background: "transparent", minWidth: 0 }}
            />
            <div className="hero-search-divider" style={{ width: 1, background: "#e5e7eb", margin: "4px 0" }} />
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Stad of regio"
              className="hero-location-input"
              style={{ width: 140, border: "none", outline: "none", fontSize: 14, color: "#111827", padding: "8px 12px", background: "transparent" }}
            />
            <button
              type="submit"
              className="hero-search-button"
              style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Zoeken
            </button>
          </form>

          {/* Stats */}
          <div className="hero-stats" style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 24 }}>
            {[
              { n: vacancies.length > 0 ? `${vacancies.length}+` : "14.780+", label: "vacatures" },
              { n: "200+", label: "bedrijven" },
              { n: "5.000+", label: "kandidaten" },
            ].map(s => (
              <span key={s.label} style={{ fontSize: 13, color: "#6b7280" }}>
                <strong style={{ color: "#111827", fontWeight: 700 }}>{s.n}</strong> {s.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIEËN ── */}
      <section style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6", padding: "40px 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
            Categorieën
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <Link
                key={cat}
                href={`/vacatures?q=${encodeURIComponent(cat)}`}
                style={{
                  display: "inline-block",
                  padding: "7px 16px",
                  borderRadius: 100,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#374151",
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#7C3AED"; (e.currentTarget as HTMLElement).style.color = "#7C3AED"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLElement).style.color = "#374151"; }}
              >
                {cat}
              </Link>
            ))}
            <Link
              href="/vacatures"
              style={{ display: "inline-block", padding: "7px 16px", borderRadius: 100, border: "1px solid transparent", background: "transparent", fontSize: 13, fontWeight: 600, color: "#7C3AED", textDecoration: "none" }}
            >
              Alle categorieën →
            </Link>
          </div>
        </div>
      </section>

      {/* ── VACATURES ── */}
      <section style={{ background: "#f9fafb", padding: "40px 0 60px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Nieuwste vacatures
            </p>
            <Link href="/vacatures" style={{ fontSize: 13, fontWeight: 600, color: "#7C3AED", textDecoration: "none" }}>
              Alle vacatures →
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {vacancies.length === 0
              ? [...Array(5)].map((_, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: 10, border: "1px solid #f3f4f6", padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f3f4f6", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 12, background: "#f3f4f6", borderRadius: 6, width: "45%", marginBottom: 7 }} />
                      <div style={{ height: 10, background: "#f9fafb", borderRadius: 6, width: "30%" }} />
                    </div>
                  </div>
                ))
              : vacancies.slice(0, 8).map(v => (
                  <Link
                    key={v.id}
                    href={`/vacatures/${v.id}`}
                    style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", borderRadius: 10, border: "1px solid #f3f4f6", padding: "14px 16px", textDecoration: "none", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#d1fae5"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#f3f4f6"}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: getColor(v.id), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                      {getInitials(v.title)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.title}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{v.location || "Locatie onbekend"}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {v.salary_range && (
                        <span className="vacancy-salary-chip" style={{ fontSize: 12, color: "#374151", padding: "3px 10px", borderRadius: 100, border: "1px solid #e5e7eb", background: "#f9fafb" }}>
                          {v.salary_range}
                        </span>
                      )}
                      {v.hours_per_week && (
                        <span style={{ fontSize: 12, color: "#7C3AED", padding: "3px 10px", borderRadius: 100, background: "#f0fdfa", fontWeight: 500 }}>
                          {v.hours_per_week}u
                        </span>
                      )}
                    </div>
                  </Link>
                ))
            }
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "#f8fafc", borderTop: "1px solid #f3f4f6", padding: "60px 24px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
            Klaar om te starten?
          </h2>
          <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 24 }}>
            Maak een gratis account, upload je CV en ontvang AI-matches op maat.
          </p>
          <div className="cta-buttons" style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link href="/candidate/login" style={{ background: "#7C3AED", color: "#fff", padding: "11px 28px", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
              Maak account aan
            </Link>
            <Link href="/vacatures" style={{ background: "#f9fafb", color: "#374151", padding: "11px 28px", borderRadius: 10, fontSize: 14, fontWeight: 500, textDecoration: "none", border: "1px solid #e5e7eb" }}>
              Bekijk vacatures
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
