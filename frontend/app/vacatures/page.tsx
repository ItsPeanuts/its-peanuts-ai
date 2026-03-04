"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listVacancies, PublicVacancy } from "@/lib/api";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

const JOB_TYPES = [
  { label: "Fulltime",       value: "fulltime" },
  { label: "Parttime",       value: "parttime" },
  { label: "Freelance/Flex", value: "flex"     },
];

const CARD_COLORS = [
  "#0f766e", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#059669", "#0284c7", "#d97706",
];
const getColor    = (id: number) => CARD_COLORS[id % CARD_COLORS.length];
const getInitials = (t: string)  =>
  t.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");

const MOCK: PublicVacancy[] = [
  { id: 1, title: "Senior Frontend Developer",  location: "Amsterdam",  hours_per_week: "40", salary_range: "€4.500 – €6.000", description: "Bouw React applicaties voor miljoenen gebruikers.", created_at: "2026-02-20T10:00:00" },
  { id: 2, title: "Product Manager",             location: "Rotterdam",  hours_per_week: "40", salary_range: "€5.000 – €7.000", description: "Leid productontwikkeling van concept tot lancering.",  created_at: "2026-02-19T09:00:00" },
  { id: 3, title: "Data Scientist",              location: "Utrecht",    hours_per_week: "32", salary_range: "€4.000 – €5.500", description: "Analyseer datasets en bouw ML-modellen.",              created_at: "2026-02-18T14:00:00" },
  { id: 4, title: "UX/UI Designer",              location: "Den Haag",   hours_per_week: "40", salary_range: "€3.500 – €5.000", description: "Ontwerp gebruiksvriendelijke interfaces.",              created_at: "2026-02-17T11:00:00" },
  { id: 5, title: "DevOps Engineer",             location: "Amsterdam",  hours_per_week: "40", salary_range: "€5.500 – €7.500", description: "Beheer cloud-infrastructuur en automatiseer deploys.",  created_at: "2026-02-16T08:00:00" },
  { id: 6, title: "Marketing Manager",           location: "Eindhoven",  hours_per_week: "32", salary_range: "€3.800 – €5.200", description: "Ontwikkel en voer marketingstrategieën uit.",           created_at: "2026-02-15T13:00:00" },
];

export default function VacaturesPage() {
  const [vacancies, setVacancies] = useState<PublicVacancy[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState("");
  const [location,  setLocation]  = useState("");
  const [jobTypes,  setJobTypes]  = useState<string[]>([]);

  const load = useCallback(async (q?: string, loc?: string) => {
    setLoading(true);
    try {
      const data = await listVacancies({ q, location: loc });
      setVacancies(data.length > 0 ? data : MOCK);
    } catch {
      setVacancies(MOCK);
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
    setJobTypes(p => p.includes(val) ? p.filter(v => v !== val) : [...p, val]);

  const filtered = vacancies.filter(v => {
    if (jobTypes.length === 0) return true;
    const h = parseInt(v.hours_per_week ?? "0");
    return jobTypes.some(f => {
      if (f === "fulltime") return h >= 32;
      if (f === "parttime") return h > 0 && h < 32;
      if (f === "flex")     return isNaN(h) || h === 0;
      return true;
    });
  });

  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh" }}>
      <PublicNav />

      {/* ── Zoekbalk header ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "24px 0" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", paddingLeft: 12, gap: 8 }}>
              <svg width="16" height="16" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Functie, trefwoord..."
                style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#111827", padding: "10px 12px 10px 0", background: "transparent" }}
              />
            </div>
            <div style={{ width: 200, display: "flex", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", paddingLeft: 12, gap: 8 }}>
              <svg width="16" height="16" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <input
                type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Stad of regio..."
                style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#111827", padding: "10px 0", background: "transparent" }}
              />
            </div>
            <button
              type="submit"
              style={{ background: "#0f766e", color: "#fff", border: "none", borderRadius: 10, padding: "0 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Zoeken
            </button>
          </form>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px", display: "flex", gap: 24, alignItems: "flex-start" }}>

        {/* Sidebar filters */}
        <aside style={{ width: 200, flexShrink: 0, position: "sticky", top: 88 }}>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
              Filters
            </p>

            <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Type werk</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {JOB_TYPES.map(t => (
                <label key={t.value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={jobTypes.includes(t.value)}
                    onChange={() => toggleType(t.value)}
                    style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#0f766e" }}
                  />
                  <span style={{ fontSize: 13, color: "#374151" }}>{t.label}</span>
                </label>
              ))}
            </div>

            {(jobTypes.length > 0 || query || location) && (
              <button
                onClick={() => { setJobTypes([]); setQuery(""); setLocation(""); load(); }}
                style={{ marginTop: 16, fontSize: 12, color: "#0f766e", fontWeight: 600, background: "none", border: "none", padding: 0, cursor: "pointer" }}
              >
                Filters wissen
              </button>
            )}
          </div>
        </aside>

        {/* Resultaten */}
        <main style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              {loading ? "Laden..." : (
                <><strong style={{ color: "#111827" }}>{filtered.length}</strong> vacature{filtered.length !== 1 ? "s" : ""} gevonden</>
              )}
            </p>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px", display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, background: "#f3f4f6", borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 13, background: "#f3f4f6", borderRadius: 6, width: "40%", marginBottom: 8 }} />
                    <div style={{ height: 11, background: "#f9fafb", borderRadius: 6, width: "25%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "48px", textAlign: "center" }}>
              <p style={{ fontWeight: 600, color: "#374151", marginBottom: 4 }}>Geen vacatures gevonden</p>
              <p style={{ fontSize: 13, color: "#9ca3af" }}>Pas je zoekopdracht of filters aan</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {filtered.map(v => (
                <div key={v.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* Logo */}
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: getColor(v.id), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                      {getInitials(v.title)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link
                        href={`/vacatures/${v.id}`}
                        style={{ fontSize: 14, fontWeight: 600, color: "#111827", textDecoration: "none", display: "block" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#0f766e"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#111827"}
                      >
                        {v.title}
                      </Link>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                        {v.location || "Locatie onbekend"}
                        {v.hours_per_week && ` · ${v.hours_per_week}u/week`}
                      </div>
                    </div>

                    {/* Badges + knop */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {v.salary_range && (
                        <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 100, border: "1px solid #e5e7eb", color: "#374151", background: "#f9fafb" }}>
                          {v.salary_range}
                        </span>
                      )}
                      <Link
                        href={`/vacatures/${v.id}/solliciteer`}
                        style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: "#0f766e", padding: "7px 16px", borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#0d6b63"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#0f766e"}
                      >
                        Solliciteer
                      </Link>
                    </div>
                  </div>

                  {/* Beschrijving */}
                  {v.description && (
                    <p style={{ fontSize: 12, color: "#6b7280", marginTop: 10, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {v.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* CTA onderaan */}
          {!loading && filtered.length > 0 && (
            <div style={{ marginTop: 24, background: "#f0fdfa", border: "1px solid #ccfbf1", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <p style={{ fontWeight: 600, color: "#134e4a", fontSize: 14, marginBottom: 2 }}>Maak je profiel compleet</p>
                <p style={{ fontSize: 12, color: "#0f766e" }}>Upload je CV en ontvang automatisch AI-matches.</p>
              </div>
              <Link
                href="/candidate/login"
                style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: "#0f766e", padding: "8px 18px", borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap" }}
              >
                Start nu
              </Link>
            </div>
          )}
        </main>
      </div>
      <PublicFooter />
    </div>
  );
}
