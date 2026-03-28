"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { listVacancies, PublicVacancy } from "@/lib/api";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import { useLanguage } from "@/lib/i18n";

const CARD_COLORS = [
  "#7C3AED", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#059669", "#0284c7", "#d97706",
];
const getColor    = (id: number) => CARD_COLORS[id % CARD_COLORS.length];
const getInitials = (t: string)  =>
  t.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");

const HOURS_RANGES = [
  { label_nl: "< 16 uur",    label_en: "< 16 h",     min: 0,  max: 15 },
  { label_nl: "16 – 24 uur", label_en: "16 – 24 h",  min: 16, max: 24 },
  { label_nl: "24 – 32 uur", label_en: "24 – 32 h",  min: 25, max: 32 },
  { label_nl: "32 – 40 uur", label_en: "32 – 40 h",  min: 33, max: 40 },
  { label_nl: "40+ uur",     label_en: "40+ h",       min: 40, max: 999 },
];

/** Parseer een salaris-string zoals "€4.500 – €6.000" naar [4500, 6000] */
function parseSalary(raw: string | null): [number, number] | null {
  if (!raw) return null;
  const nums = raw.replace(/\./g, "").match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  const vals = nums.map(Number);
  return [Math.min(...vals), Math.max(...vals)];
}

/** Parseer uren-string naar [min, max]. Bijv. "32-40" → [32, 40], "40 uur" → [40, 40] */
function parseHours(raw: string | null | undefined): [number, number] | null {
  if (!raw) return null;
  const nums = raw.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return null;
  return [Math.min(...nums), Math.max(...nums)];
}

function matchesEmploymentType(v: { employment_type: string | null; hours_per_week: string | null }, types: string[]): boolean {
  if (types.length === 0) return true;
  const vType = v.employment_type?.toLowerCase();
  if (vType) return types.includes(vType);
  const hours = parseHours(v.hours_per_week);
  if (!hours) return false;
  const [minH, maxH] = hours;
  for (const t of types) {
    if (t === "fulltime" && maxH >= 36) return true;
    if (t === "parttime" && minH >= 16 && minH < 36) return true;
  }
  return false;
}

function VacaturesContent() {
  const searchParams = useSearchParams();
  const { lang, T } = useLanguage();

  const [vacancies, setVacancies] = useState<PublicVacancy[]>([]);
  const [loading,   setLoading]   = useState(true);

  const [query,    setQuery]    = useState(searchParams.get("q") ?? "");
  const [location, setLocation] = useState(searchParams.get("location") ?? "");

  const [employmentTypes, setEmploymentTypes] = useState<string[]>([]);
  const [workLocations,   setWorkLocations]   = useState<string[]>([]);
  const [datePosted,      setDatePosted]      = useState<string>("");
  const [vacancyLang,     setVacancyLang]     = useState<string[]>([]);

  const [hoursRange,  setHoursRange]  = useState<number | null>(null);
  const [salaryMin,   setSalaryMin]   = useState<string>("");
  const [salaryMax,   setSalaryMax]   = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const EMPLOYMENT_TYPES = [
    { label: T.jobs.fulltime,  value: "fulltime" },
    { label: T.jobs.parttime,  value: "parttime" },
    { label: T.jobs.freelance, value: "freelance" },
    { label: T.jobs.stage,     value: "stage" },
    { label: T.jobs.tijdelijk, value: "tijdelijk" },
  ];

  const WORK_LOCATIONS = [
    { label: T.jobs.remote,    value: "remote" },
    { label: T.jobs.hybride,   value: "hybride" },
    { label: T.jobs.opLocatie, value: "op-locatie" },
  ];

  const DATE_OPTIONS = [
    { label: T.jobs.today,     value: "today" },
    { label: T.jobs.last3days, value: "3days" },
    { label: T.jobs.lastWeek,  value: "week" },
    { label: T.jobs.lastMonth, value: "month" },
  ];

  const VACANCY_LANGUAGES = [
    { label: T.jobs.langNl, value: "nl" },
    { label: T.jobs.langEn, value: "en" },
  ];

  const activeFilterCount =
    employmentTypes.length + workLocations.length + vacancyLang.length +
    (datePosted ? 1 : 0) + (hoursRange !== null ? 1 : 0) +
    (salaryMin ? 1 : 0) + (salaryMax ? 1 : 0);

  const load = useCallback(async (params: {
    q?: string;
    location?: string;
    date_posted?: string;
  }) => {
    setLoading(true);
    try {
      const data = await listVacancies({ ...params, limit: 100 });
      setVacancies(data);
    } catch {
      setVacancies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({
      q:        searchParams.get("q") ?? undefined,
      location: searchParams.get("location") ?? undefined,
    });
  }, [load, searchParams]);

  useEffect(() => {
    load({
      q:           query || undefined,
      location:    location || undefined,
      date_posted: datePosted || undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employmentTypes, workLocations, datePosted, vacancyLang]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load({
      q:           query || undefined,
      location:    location || undefined,
      date_posted: datePosted || undefined,
    });
  };

  const toggleEmploymentType = (val: string) =>
    setEmploymentTypes(p => p.includes(val) ? p.filter(v => v !== val) : [...p, val]);

  const toggleWorkLocation = (val: string) =>
    setWorkLocations(p => p.includes(val) ? p.filter(v => v !== val) : [...p, val]);

  const toggleVacancyLang = (val: string) =>
    setVacancyLang(p => p.includes(val) ? p.filter(v => v !== val) : [...p, val]);

  const clearFilters = () => {
    setEmploymentTypes([]);
    setWorkLocations([]);
    setDatePosted("");
    setHoursRange(null);
    setSalaryMin("");
    setSalaryMax("");
    setVacancyLang([]);
    setQuery("");
    setLocation("");
    load({});
  };

  const filtered = vacancies.filter(v => {
    if (!matchesEmploymentType(v, employmentTypes)) return false;
    if (workLocations.length > 0) {
      const vWl = v.work_location?.toLowerCase();
      if (!vWl || !workLocations.includes(vWl)) return false;
    }
    if (vacancyLang.length > 0) {
      const vl = (v as PublicVacancy & { language?: string | null }).language ?? null;
      if (!vl || !vacancyLang.includes(vl)) return false;
    }
    if (hoursRange !== null) {
      const range = HOURS_RANGES[hoursRange];
      const hours = parseHours(v.hours_per_week);
      if (!hours) return false;
      const [minH, maxH] = hours;
      if (maxH < range.min || minH > range.max) return false;
    }
    const parsed = parseSalary(v.salary_range);
    if (salaryMin) {
      const min = parseInt(salaryMin);
      if (isNaN(min)) return true;
      if (!parsed || parsed[1] < min) return false;
    }
    if (salaryMax) {
      const max = parseInt(salaryMax);
      if (isNaN(max)) return true;
      if (!parsed || parsed[0] > max) return false;
    }
    return true;
  });

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 10 }}>
      {children}
    </p>
  );

  const FilterCheckbox = ({
    label, checked, onChange,
  }: { label: string; checked: boolean; onChange: () => void }) => (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "3px 0" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#7C3AED", flexShrink: 0 }}
      />
      <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>
    </label>
  );

  const foundText = loading
    ? T.jobs.loading
    : `${filtered.length} ${filtered.length !== 1 ? T.jobs.vacancies : T.jobs.vacancy} ${T.jobs.found}`;

  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh", overflowX: "hidden" }}>
      <PublicNav />

      {/* ── Zoekbalk ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "20px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <form onSubmit={handleSearch} className="vac-search-form" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", paddingLeft: 12, gap: 8, minWidth: 0 }}>
              <svg width="16" height="16" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder={T.jobs.searchPlaceholder}
                style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#111827", padding: "10px 12px 10px 0", background: "transparent" }}
              />
            </div>
            <div className="vac-location-input" style={{ width: 200, display: "flex", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", paddingLeft: 12, gap: 8 }}>
              <svg width="16" height="16" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <input
                type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder={T.jobs.locationPlaceholder}
                style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#111827", padding: "10px 0", background: "transparent" }}
              />
            </div>
            <div className="vac-search-buttons" style={{ display: "flex", gap: 8 }}>
              <button
                type="submit"
                style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 10, padding: "0 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                {T.jobs.searchBtn}
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(f => !f)}
                className="vac-filter-btn"
                style={{ display: "none", alignItems: "center", gap: 6, background: showFilters ? "#7C3AED" : "#f9fafb", color: showFilters ? "#fff" : "#374151", border: "1px solid #e5e7eb", borderRadius: 10, padding: "0 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" />
                </svg>
                {T.jobs.filtersBtn} {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="vac-layout" style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px", display: "flex", gap: 24, alignItems: "flex-start" }}>

        {/* ── Sidebar filters ── */}
        <aside className={`vac-sidebar${showFilters ? " open" : ""}`} style={{ width: 220, flexShrink: 0, position: "sticky", top: 88 }}>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{T.jobs.filters}</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  style={{ fontSize: 12, color: "#7C3AED", fontWeight: 600, background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  {T.jobs.clearAll} ({activeFilterCount})
                </button>
              )}
            </div>

            {/* Datum geplaatst */}
            <div>
              <SectionTitle>{T.jobs.datePosted}</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {DATE_OPTIONS.map(opt => (
                  <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "3px 0" }}>
                    <input
                      type="radio"
                      name="datePosted"
                      checked={datePosted === opt.value}
                      onChange={() => setDatePosted(prev => prev === opt.value ? "" : opt.value)}
                      onClick={() => { if (datePosted === opt.value) setDatePosted(""); }}
                      style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#7C3AED", flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 13, color: "#374151" }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Dienstverband */}
            <div>
              <SectionTitle>{T.jobs.employmentType}</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {EMPLOYMENT_TYPES.map(t => (
                  <FilterCheckbox
                    key={t.value}
                    label={t.label}
                    checked={employmentTypes.includes(t.value)}
                    onChange={() => toggleEmploymentType(t.value)}
                  />
                ))}
              </div>
            </div>

            {/* Werklocatie */}
            <div>
              <SectionTitle>{T.jobs.workLocation}</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {WORK_LOCATIONS.map(t => (
                  <FilterCheckbox
                    key={t.value}
                    label={t.label}
                    checked={workLocations.includes(t.value)}
                    onChange={() => toggleWorkLocation(t.value)}
                  />
                ))}
              </div>
            </div>

            {/* Taal vacature */}
            <div>
              <SectionTitle>{T.jobs.vacancyLanguage}</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {VACANCY_LANGUAGES.map(l => (
                  <FilterCheckbox
                    key={l.value}
                    label={l.label}
                    checked={vacancyLang.includes(l.value)}
                    onChange={() => toggleVacancyLang(l.value)}
                  />
                ))}
              </div>
            </div>

            {/* Uren per week */}
            <div>
              <SectionTitle>{T.jobs.hoursPerWeek}</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {HOURS_RANGES.map((r, i) => (
                  <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "3px 0" }}>
                    <input
                      type="radio"
                      name="hoursRange"
                      checked={hoursRange === i}
                      onChange={() => setHoursRange(prev => prev === i ? null : i)}
                      onClick={() => { if (hoursRange === i) setHoursRange(null); }}
                      style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#7C3AED", flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 13, color: "#374151" }}>{lang === "en" ? r.label_en : r.label_nl}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Salaris */}
            <div>
              <SectionTitle>{T.jobs.salary}</SectionTitle>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  value={salaryMin}
                  onChange={e => setSalaryMin(e.target.value)}
                  placeholder={T.jobs.minSalary}
                  style={{ width: "50%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", fontSize: 13, outline: "none", color: "#374151" }}
                />
                <span style={{ fontSize: 12, color: "#9ca3af" }}>–</span>
                <input
                  type="number"
                  value={salaryMax}
                  onChange={e => setSalaryMax(e.target.value)}
                  placeholder={T.jobs.maxSalary}
                  style={{ width: "50%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", fontSize: 13, outline: "none", color: "#374151" }}
                />
              </div>
            </div>

          </div>
        </aside>

        {/* ── Resultaten ── */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* Actieve filter chips */}
          {activeFilterCount > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {employmentTypes.map(et => {
                const label = EMPLOYMENT_TYPES.find(t => t.value === et)?.label ?? et;
                return (
                  <span key={et} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 100, background: "#f0fdf4", border: "1px solid #d1fae5", fontSize: 12, color: "#374151" }}>
                    {label}
                    <button onClick={() => toggleEmploymentType(et)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#6b7280", lineHeight: 1 }}>×</button>
                  </span>
                );
              })}
              {workLocations.map(wl => {
                const label = WORK_LOCATIONS.find(t => t.value === wl)?.label ?? wl;
                return (
                  <span key={wl} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 100, background: "#f5f3ff", border: "1px solid #ede9fe", fontSize: 12, color: "#374151" }}>
                    {label}
                    <button onClick={() => toggleWorkLocation(wl)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#6b7280", lineHeight: 1 }}>×</button>
                  </span>
                );
              })}
              {vacancyLang.map(vl => {
                const label = VACANCY_LANGUAGES.find(l => l.value === vl)?.label ?? vl;
                return (
                  <span key={vl} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 100, background: "#fef9c3", border: "1px solid #fef08a", fontSize: 12, color: "#374151" }}>
                    {label}
                    <button onClick={() => toggleVacancyLang(vl)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#6b7280", lineHeight: 1 }}>×</button>
                  </span>
                );
              })}
              {datePosted && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 100, background: "#fff7ed", border: "1px solid #fed7aa", fontSize: 12, color: "#374151" }}>
                  {DATE_OPTIONS.find(d => d.value === datePosted)?.label}
                  <button onClick={() => setDatePosted("")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#6b7280", lineHeight: 1 }}>×</button>
                </span>
              )}
              {hoursRange !== null && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 100, background: "#fefce8", border: "1px solid #fef08a", fontSize: 12, color: "#374151" }}>
                  {lang === "en" ? HOURS_RANGES[hoursRange].label_en : HOURS_RANGES[hoursRange].label_nl}
                  <button onClick={() => setHoursRange(null)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#6b7280", lineHeight: 1 }}>×</button>
                </span>
              )}
              {salaryMin && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 100, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 12, color: "#374151" }}>
                  Min €{salaryMin}
                  <button onClick={() => setSalaryMin("")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#6b7280", lineHeight: 1 }}>×</button>
                </span>
              )}
              {salaryMax && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 100, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 12, color: "#374151" }}>
                  Max €{salaryMax}
                  <button onClick={() => setSalaryMax("")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#6b7280", lineHeight: 1 }}>×</button>
                </span>
              )}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              {loading ? T.jobs.loading : (
                <><strong style={{ color: "#111827" }}>{filtered.length}</strong> {filtered.length !== 1 ? T.jobs.vacancies : T.jobs.vacancy} {T.jobs.found}</>
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
              <p style={{ fontWeight: 600, color: "#374151", marginBottom: 4 }}>{T.jobs.noResults}</p>
              <p style={{ fontSize: 13, color: "#9ca3af" }}>{T.jobs.noResultsHint}</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  style={{ marginTop: 12, fontSize: 13, color: "#7C3AED", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
                >
                  {T.jobs.removeFilters}
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {filtered.map(v => {
                const vWithLang = v as PublicVacancy & { language?: string | null };
                return (
                  <div key={v.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 20px" }}>
                    <div className="vacancy-card-inner" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: getColor(v.id), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                        {getInitials(v.title)}
                      </div>

                      <div className="vacancy-card-content" style={{ flex: 1, minWidth: 0 }}>
                        <Link
                          href={`/vacatures/${v.id}`}
                          style={{ fontSize: 14, fontWeight: 600, color: "#111827", textDecoration: "none", display: "block" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#7C3AED"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#111827"}
                        >
                          {v.title}
                        </Link>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                          {v.location && <span>{v.location}</span>}
                          {v.hours_per_week && <span>· {v.hours_per_week}{T.jobs.perWeek}</span>}
                          {v.employment_type && (
                            <span style={{ background: "#f3f4f6", borderRadius: 100, padding: "1px 8px", fontSize: 11 }}>
                              {EMPLOYMENT_TYPES.find(t => t.value === v.employment_type)?.label ?? v.employment_type}
                            </span>
                          )}
                          {v.work_location && (
                            <span style={{
                              background: v.work_location === "remote" ? "#f0fdf4" : v.work_location === "hybride" ? "#f5f3ff" : "#fff7ed",
                              borderRadius: 100, padding: "1px 8px", fontSize: 11,
                              color: v.work_location === "remote" ? "#15803d" : v.work_location === "hybride" ? "#6D28D9" : "#c2410c",
                            }}>
                              {WORK_LOCATIONS.find(t => t.value === v.work_location)?.label ?? v.work_location}
                            </span>
                          )}
                          {vWithLang.language && (
                            <span style={{ background: "#f0f9ff", borderRadius: 100, padding: "1px 8px", fontSize: 11, color: "#0369a1" }}>
                              {vWithLang.language.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="vacancy-card-actions" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        {v.salary_range && (
                          <span className="vacancy-salary-chip" style={{ fontSize: 12, padding: "3px 10px", borderRadius: 100, border: "1px solid #e5e7eb", color: "#374151", background: "#f9fafb" }}>
                            {v.salary_range}
                          </span>
                        )}
                        <Link
                          href={`/vacatures/${v.id}/solliciteer`}
                          style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: "#7C3AED", padding: "7px 16px", borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#6D28D9"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#7C3AED"}
                        >
                          {T.jobs.applyBtn}
                        </Link>
                      </div>
                    </div>

                    {v.description && (
                      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 10, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {v.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div style={{ marginTop: 24, background: "#f5f3ff", border: "1px solid #ede9fe", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <p style={{ fontWeight: 600, color: "#4c1d95", fontSize: 14, marginBottom: 2 }}>{T.jobs.profileCta}</p>
                <p style={{ fontSize: 12, color: "#7C3AED" }}>{T.jobs.profileCtaSub}</p>
              </div>
              <Link
                href="/candidate/login"
                style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: "#7C3AED", padding: "8px 18px", borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap" }}
              >
                {T.jobs.startNow}
              </Link>
            </div>
          )}
        </main>
      </div>

      <PublicFooter />
    </div>
  );
}

export default function VacaturesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f9fafb" }}><PublicNav /></div>}>
      <VacaturesContent />
    </Suspense>
  );
}
