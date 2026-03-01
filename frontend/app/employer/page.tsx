"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createVacancy, employerVacancies, me,
  getEmployerApplications, updateApplicationStatus,
  ApplicationWithCandidate,
} from "@/lib/api";
import { clearSession, getRole, getToken } from "@/lib/session";

type Vacancy = {
  id: number;
  title: string;
  location?: string | null;
  hours_per_week?: string | null;
  salary_range?: string | null;
  description?: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; next: string[] }> = {
  applied:     { label: "Nieuw",        color: "#6b7280", bg: "#f3f4f6", next: ["shortlisted", "rejected"] },
  shortlisted: { label: "Geselecteerd", color: "#1d4ed8", bg: "#dbeafe", next: ["interview", "rejected"] },
  interview:   { label: "Interview",    color: "#d97706", bg: "#fef3c7", next: ["hired", "rejected"] },
  hired:       { label: "Aangenomen",   color: "#059669", bg: "#d1fae5", next: [] },
  rejected:    { label: "Afgewezen",    color: "#dc2626", bg: "#fee2e2", next: [] },
};

const AVATAR_COLORS = ["bg-teal-500", "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-green-500"];
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }
function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400">Geen score</span>;
  const color = score >= 70 ? "#059669" : score >= 40 ? "#d97706" : "#dc2626";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{score}%</span>
    </div>
  );
}

export default function EmployerPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const role = useMemo(() => getRole(), []);

  const [userEmail, setUserEmail] = useState("");
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [applications, setApplications] = useState<ApplicationWithCandidate[]>([]);
  const [selectedVacancy, setSelectedVacancy] = useState<number | null>(null);
  const [view, setView] = useState<"vacancies" | "applications" | "new-vacancy">("vacancies");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Create vacancy form
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [hours, setHours] = useState("");
  const [salary, setSalary] = useState("");
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token) { router.push("/employer/login"); return; }
    if (role && role !== "employer") { router.push("/candidate"); return; }

    (async () => {
      try {
        const [u, vacs] = await Promise.all([me(token), employerVacancies(token)]);
        setUserEmail(u.email || "");
        setVacancies(vacs || []);
        const apps = await getEmployerApplications(token);
        setApplications(apps);
      } catch {
        clearSession();
        router.push("/employer/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, role, token]);

  async function loadApplications(vacancyId?: number) {
    try {
      const apps = await getEmployerApplications(token, vacancyId);
      setApplications(apps);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Kon sollicitaties niet laden");
    }
  }

  async function handleVacancyClick(v: Vacancy) {
    setSelectedVacancy(v.id);
    setView("applications");
    await loadApplications(v.id);
  }

  async function handleStatusChange(appId: number, newStatus: string) {
    try {
      await updateApplicationStatus(token, appId, newStatus);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );
      setMsg(`Status bijgewerkt naar "${STATUS_CONFIG[newStatus]?.label ?? newStatus}"`);
      setTimeout(() => setMsg(""), 3000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Status bijwerken mislukt");
    }
  }

  async function doCreateVacancy(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErr("");
    try {
      await createVacancy(token, { title, location, hours_per_week: hours, salary_range: salary, description: desc });
      const vacs = await employerVacancies(token);
      setVacancies(vacs || []);
      setTitle(""); setLocation(""); setHours(""); setSalary(""); setDesc("");
      setMsg("Vacature aangemaakt!");
      setView("vacancies");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Aanmaken mislukt");
    } finally {
      setCreating(false);
    }
  }

  const selectedVacancyName = vacancies.find((v) => v.id === selectedVacancy)?.title ?? "Alle vacatures";
  const appCountPerVacancy = (id: number) => applications.filter((a) => a.vacancy_id === id).length;
  const totalApps = applications.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 min-h-screen">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: "#0DA89E" }}>P</div>
            <span className="font-bold text-gray-900 text-sm">It&apos;s Peanuts AI</span>
          </div>
          <div className="text-xs text-gray-400 mt-1 truncate">{userEmail}</div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-3 py-2">Navigatie</p>

          <button
            onClick={() => { setView("vacancies"); setSelectedVacancy(null); loadApplications(); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              view === "vacancies" ? "text-teal-700 bg-teal-50" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            📋 Mijn vacatures
            <span className="float-right text-xs text-gray-400">{vacancies.length}</span>
          </button>

          <button
            onClick={() => { setView("applications"); setSelectedVacancy(null); loadApplications(); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              view === "applications" && !selectedVacancy ? "text-teal-700 bg-teal-50" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            👥 Alle sollicitanten
            <span className="float-right text-xs text-gray-400">{totalApps}</span>
          </button>

          <button
            onClick={() => setView("new-vacancy")}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              view === "new-vacancy" ? "text-orange-700 bg-orange-50" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            + Vacature plaatsen
          </button>

          {vacancies.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-3 py-2 mt-4">Vacatures</p>
              {vacancies.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleVacancyClick(v)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    selectedVacancy === v.id ? "text-teal-700 bg-teal-50 font-medium" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="truncate block pr-6">{v.title}</span>
                  <span className="float-right text-xs text-gray-400 -mt-5">{appCountPerVacancy(v.id)}</span>
                </button>
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => { clearSession(); router.push("/"); }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            Uitloggen
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">

        {/* Notificaties */}
        {msg && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm mb-5">{msg}</div>
        )}
        {err && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mb-5">{err}</div>
        )}

        {/* === VACATURES OVERZICHT === */}
        {view === "vacancies" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mijn vacatures</h1>
                <p className="text-sm text-gray-500 mt-1">{vacancies.length} actieve vacature{vacancies.length !== 1 ? "s" : ""}</p>
              </div>
              <button
                onClick={() => setView("new-vacancy")}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90"
                style={{ background: "#f97316" }}
              >
                + Vacature plaatsen
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-5 mb-6">
              {[
                { label: "Actieve vacatures", value: vacancies.length, icon: "📋", color: "#0DA89E" },
                { label: "Totaal sollicitanten", value: totalApps, icon: "👥", color: "#3b82f6" },
                { label: "Gem. matchscore", value: (() => {
                  const scored = applications.filter((a) => a.match_score !== null);
                  if (!scored.length) return "—";
                  return Math.round(scored.reduce((s, a) => s + (a.match_score ?? 0), 0) / scored.length) + "%";
                })(), icon: "🤖", color: "#8b5cf6" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-sm text-gray-500">{s.label}</span>
                  </div>
                  <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {vacancies.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-14 text-center">
                <div className="text-5xl mb-4">📋</div>
                <div className="text-lg font-semibold text-gray-700 mb-2">Nog geen vacatures</div>
                <div className="text-gray-400 text-sm mb-6">Plaats je eerste vacature en vind de beste kandidaten.</div>
                <button onClick={() => setView("new-vacancy")}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90" style={{ background: "#f97316" }}>
                  + Vacature plaatsen
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {vacancies.map((v) => {
                  const color = avatarColor(v.id);
                  const appCount = appCountPerVacancy(v.id);
                  const vacApps = applications.filter((a) => a.vacancy_id === v.id);
                  const topScore = vacApps.reduce((max, a) => Math.max(max, a.match_score ?? 0), 0);
                  return (
                    <div key={v.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-teal-200 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                          {getInitials(v.title)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900">{v.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {v.location && `${v.location} · `}{v.hours_per_week && `${v.hours_per_week}u/week · `}{v.salary_range || ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-center">
                            <div className="text-xl font-bold text-gray-900">{appCount}</div>
                            <div className="text-xs text-gray-400">sollicitant{appCount !== 1 ? "en" : ""}</div>
                          </div>
                          {topScore > 0 && (
                            <div className="text-center">
                              <div className="text-xl font-bold" style={{ color: topScore >= 70 ? "#059669" : "#d97706" }}>{topScore}%</div>
                              <div className="text-xs text-gray-400">top score</div>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVacancyClick(v)}
                              className="px-4 py-2 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
                            >
                              👥 Bekijk sollicitanten
                            </button>
                            <Link
                              href={`/vacatures/${v.id}`}
                              className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 no-underline transition-colors"
                            >
                              Vacature →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* === SOLLICITANTEN OVERZICHT === */}
        {view === "applications" && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => { setView("vacancies"); setSelectedVacancy(null); }} className="text-sm text-gray-500 hover:text-gray-700">
                ← Terug
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {selectedVacancy ? selectedVacancyName : "Alle sollicitanten"}
                </h1>
                <p className="text-sm text-gray-500 mt-1">{applications.length} sollicitant{applications.length !== 1 ? "en" : ""}</p>
              </div>
            </div>

            {applications.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-14 text-center">
                <div className="text-5xl mb-4">👥</div>
                <div className="text-lg font-semibold text-gray-700 mb-2">Nog geen sollicitanten</div>
                <div className="text-gray-400 text-sm">Deel de vacature en wacht op de eerste sollicitaties.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => {
                  const sc = STATUS_CONFIG[app.status] ?? { label: app.status, color: "#374151", bg: "#f3f4f6", next: [] };
                  const initials = getInitials(app.candidate_name);
                  const color = avatarColor(app.candidate_id);
                  return (
                    <div key={app.id} className="bg-white rounded-xl border border-gray-100 p-5">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                          {initials}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-semibold text-gray-900">{app.candidate_name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{app.candidate_email}</div>
                              {!selectedVacancy && (
                                <div className="text-xs text-teal-600 mt-0.5 font-medium">
                                  {vacancies.find((v) => v.id === app.vacancy_id)?.title ?? "Vacature"}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 flex-shrink-0">
                              {new Date(app.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                            </div>
                          </div>

                          {/* AI Score */}
                          <div className="mt-3 w-48">
                            <div className="text-xs text-gray-400 mb-1">AI Matchscore</div>
                            <ScoreBar score={app.match_score} />
                          </div>

                          {/* AI Samenvatting */}
                          {app.ai_summary && (
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{app.ai_summary}</p>
                          )}

                          {/* AI Details uitklapper */}
                          {(app.ai_strengths || app.ai_gaps) && (
                            <details className="mt-2">
                              <summary className="text-xs text-teal-600 cursor-pointer font-medium hover:text-teal-700">
                                Zie AI-analyse ▾
                              </summary>
                              <div className="mt-2 space-y-2">
                                {app.ai_strengths && (
                                  <div className="bg-green-50 rounded-lg p-3">
                                    <div className="text-xs font-semibold text-green-700 mb-1">✅ Sterktes</div>
                                    <div className="text-xs text-green-600">{app.ai_strengths}</div>
                                  </div>
                                )}
                                {app.ai_gaps && (
                                  <div className="bg-red-50 rounded-lg p-3">
                                    <div className="text-xs font-semibold text-red-700 mb-1">⚠️ Aandachtspunten</div>
                                    <div className="text-xs text-red-600">{app.ai_gaps}</div>
                                  </div>
                                )}
                                {app.ai_suggested_questions && (
                                  <div className="bg-blue-50 rounded-lg p-3">
                                    <div className="text-xs font-semibold text-blue-700 mb-1">💬 Interviewvragen</div>
                                    <div className="text-xs text-blue-600">{app.ai_suggested_questions}</div>
                                  </div>
                                )}
                              </div>
                            </details>
                          )}
                        </div>

                        {/* Status + acties */}
                        <div className="flex-shrink-0 flex flex-col items-end gap-3">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: sc.color, background: sc.bg }}>
                            {sc.label}
                          </span>
                          {sc.next.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap justify-end">
                              {sc.next.map((nextStatus) => {
                                const ns = STATUS_CONFIG[nextStatus];
                                return (
                                  <button
                                    key={nextStatus}
                                    onClick={() => handleStatusChange(app.id, nextStatus)}
                                    className="px-3 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                                    style={{ color: ns.color, background: ns.bg }}
                                  >
                                    → {ns.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* === VACATURE AANMAKEN === */}
        {view === "new-vacancy" && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setView("vacancies")} className="text-sm text-gray-500 hover:text-gray-700">
                ← Terug
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Nieuwe vacature plaatsen</h1>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-2xl">
              <form onSubmit={doCreateVacancy} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Functietitel *</label>
                  <input required value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="bijv. Senior Developer"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Locatie</label>
                    <input value={location} onChange={(e) => setLocation(e.target.value)}
                      placeholder="bijv. Amsterdam"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Uren per week</label>
                    <input value={hours} onChange={(e) => setHours(e.target.value)}
                      placeholder="bijv. 40"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Salarisrange</label>
                  <input value={salary} onChange={(e) => setSalary(e.target.value)}
                    placeholder="bijv. €3.500 - €5.000"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Omschrijving</label>
                  <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={5}
                    placeholder="Beschrijf de functie, eisen en wat jouw bedrijf te bieden heeft..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={creating}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 hover:opacity-90"
                    style={{ background: "#0DA89E" }}>
                    {creating ? "Aanmaken..." : "Vacature aanmaken"}
                  </button>
                  <button type="button" onClick={() => setView("vacancies")}
                    className="px-6 py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200">
                    Annuleren
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
