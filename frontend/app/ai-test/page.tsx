"use client";

import { useState } from "react";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://its-peanuts-backend.onrender.com";

type Tab = "rewrite" | "motivation" | "match";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "rewrite",    label: "CV Herschrijven",  icon: "📝" },
  { id: "motivation", label: "Motivatiebrief",   icon: "✉️" },
  { id: "match",      label: "Job Matching",     icon: "🎯" },
];

const SAMPLE_CV = `Naam: Jan de Vries
Locatie: Amsterdam

WERKERVARING
2020 - heden: Frontend Developer bij Acme BV
- React, TypeScript, Next.js
- CI/CD pipelines opgezet

2018 - 2020: Junior Developer bij Startup XYZ
- Vue.js en Python

OPLEIDING
HBO Informatica - Hogeschool Amsterdam (2018)

VAARDIGHEDEN
React, TypeScript, Node.js, Git, Agile/Scrum`;

const SAMPLE_JOB = `Senior Frontend Developer gezocht!

Wij zoeken een ervaren Frontend Developer voor ons groeiende team in Amsterdam.

Vereisten:
- 4+ jaar React ervaring
- TypeScript kennis
- Ervaring met Next.js is een pre
- Teamspeler, communicatief sterk

Wij bieden:
- Salaris €4.500 - €6.000
- 25 vakantiedagen
- Hybride werken mogelijk`;

export default function AITestPage() {
  const [tab, setTab] = useState<Tab>("rewrite");

  // CV Rewrite state
  const [cvText, setCvText] = useState(SAMPLE_CV);
  const [targetRole, setTargetRole] = useState("Senior Frontend Developer");
  const [rewriteResult, setRewriteResult] = useState("");
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteError, setRewriteError] = useState("");

  // Motivation letter state
  const [motCvText, setMotCvText] = useState(SAMPLE_CV);
  const [motJobDesc, setMotJobDesc] = useState(SAMPLE_JOB);
  const [motCompany, setMotCompany] = useState("Tech BV");
  const [motResult, setMotResult] = useState("");
  const [motLoading, setMotLoading] = useState(false);
  const [motError, setMotError] = useState("");

  // Match state
  const [matchProfile, setMatchProfile] = useState(SAMPLE_CV);
  const [matchJob, setMatchJob] = useState(SAMPLE_JOB);
  const [matchResult, setMatchResult] = useState<{ score: number; explanation: string } | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState("");

  async function handleRewrite() {
    setRewriteLoading(true);
    setRewriteError("");
    setRewriteResult("");
    try {
      const res = await fetch(`${BASE}/ai/rewrite-cv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: cvText, target_role: targetRole || undefined, language: "nl" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Fout bij CV herschrijven");
      setRewriteResult(data.rewritten_cv);
    } catch (e: unknown) {
      setRewriteError(e instanceof Error ? e.message : "Onbekende fout");
    } finally {
      setRewriteLoading(false);
    }
  }

  async function handleMotivation() {
    setMotLoading(true);
    setMotError("");
    setMotResult("");
    try {
      const res = await fetch(`${BASE}/ai/motivation-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cv_text: motCvText,
          job_description: motJobDesc,
          company_name: motCompany || undefined,
          language: "nl",
          tone: "professioneel",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Fout bij genereren motivatiebrief");
      setMotResult(data.letter);
    } catch (e: unknown) {
      setMotError(e instanceof Error ? e.message : "Onbekende fout");
    } finally {
      setMotLoading(false);
    }
  }

  async function handleMatch() {
    setMatchLoading(true);
    setMatchError("");
    setMatchResult(null);
    try {
      const res = await fetch(`${BASE}/ai/match-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_profile_text: matchProfile, job_description: matchJob }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Fout bij job matching");
      setMatchResult({ score: data.match_score, explanation: data.explanation });
    } catch (e: unknown) {
      setMatchError(e instanceof Error ? e.message : "Onbekende fout");
    } finally {
      setMatchLoading(false);
    }
  }

  const scoreColor = (s: number) => s >= 70 ? "#059669" : s >= 40 ? "#d97706" : "#dc2626";
  const scoreBg = (s: number) => s >= 70 ? "#d1fae5" : s >= 40 ? "#fef3c7" : "#fee2e2";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg" style={{ background: "#0DA89E" }}>
              🤖
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Test Omgeving</h1>
              <p className="text-sm text-gray-500">Test de AI-functies van It&apos;s Peanuts</p>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-medium">
            ⚠️ Verbonden met: <span className="font-mono">{BASE}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t.id
                  ? "text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-teal-200 hover:text-teal-600"
              }`}
              style={tab === t.id ? { background: "#0DA89E" } : {}}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* === CV HERSCHRIJVEN === */}
        {tab === "rewrite" && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4">CV Herschrijven met AI</h2>
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">CV Tekst</label>
                  <textarea
                    value={cvText}
                    onChange={(e) => setCvText(e.target.value)}
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Doelfunctie <span className="text-gray-400 font-normal">(optioneel)</span>
                  </label>
                  <input
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="bijv. Senior Developer"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition mb-4"
                  />
                  <button
                    onClick={handleRewrite}
                    disabled={rewriteLoading || !cvText.trim()}
                    className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 hover:opacity-90"
                    style={{ background: "#0DA89E" }}
                  >
                    {rewriteLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        AI is aan het schrijven...
                      </span>
                    ) : "📝 CV Herschrijven"}
                  </button>
                </div>
              </div>

              {rewriteError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{rewriteError}</div>
              )}
            </div>

            {rewriteResult && (
              <div className="bg-white rounded-xl border border-teal-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">✅ Herschreven CV</h3>
                  <button
                    onClick={() => navigator.clipboard.writeText(rewriteResult)}
                    className="text-xs text-teal-600 font-medium hover:text-teal-700"
                  >
                    📋 Kopiëren
                  </button>
                </div>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl p-4">
                  {rewriteResult}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* === MOTIVATIEBRIEF === */}
        {tab === "motivation" && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4">Motivatiebrief Genereren</h2>
              <div className="grid grid-cols-2 gap-5 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">CV Tekst</label>
                  <textarea
                    value={motCvText}
                    onChange={(e) => setMotCvText(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Vacaturetekst</label>
                  <textarea
                    value={motJobDesc}
                    onChange={(e) => setMotJobDesc(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Bedrijfsnaam <span className="text-gray-400 font-normal">(optioneel)</span>
                  </label>
                  <input
                    value={motCompany}
                    onChange={(e) => setMotCompany(e.target.value)}
                    placeholder="bijv. Acme BV"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
                  />
                </div>
                <button
                  onClick={handleMotivation}
                  disabled={motLoading || !motCvText.trim() || !motJobDesc.trim()}
                  className="px-8 py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 hover:opacity-90 flex-shrink-0"
                  style={{ background: "#f97316" }}
                >
                  {motLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Bezig...
                    </span>
                  ) : "✉️ Genereer brief"}
                </button>
              </div>

              {motError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{motError}</div>
              )}
            </div>

            {motResult && (
              <div className="bg-white rounded-xl border border-orange-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">✅ Motivatiebrief</h3>
                  <button
                    onClick={() => navigator.clipboard.writeText(motResult)}
                    className="text-xs text-orange-500 font-medium hover:text-orange-600"
                  >
                    📋 Kopiëren
                  </button>
                </div>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl p-4">
                  {motResult}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* === JOB MATCHING === */}
        {tab === "match" && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4">AI Job Matching — Matchscore berekenen</h2>
              <div className="grid grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kandidaatprofiel / CV</label>
                  <textarea
                    value={matchProfile}
                    onChange={(e) => setMatchProfile(e.target.value)}
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Vacaturetekst</label>
                  <textarea
                    value={matchJob}
                    onChange={(e) => setMatchJob(e.target.value)}
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition resize-none"
                  />
                </div>
              </div>
              <button
                onClick={handleMatch}
                disabled={matchLoading || !matchProfile.trim() || !matchJob.trim()}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 hover:opacity-90"
                style={{ background: "#0DA89E" }}
              >
                {matchLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    AI berekent matchscore...
                  </span>
                ) : "🎯 Bereken Matchscore"}
              </button>

              {matchError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{matchError}</div>
              )}
            </div>

            {matchResult && (
              <div className="bg-white rounded-xl border border-teal-100 p-6">
                <h3 className="font-bold text-gray-900 mb-5">✅ Matching Resultaat</h3>
                <div className="flex items-center gap-6 mb-5">
                  {/* Score cirkel */}
                  <div className="flex-shrink-0 w-28 h-28 rounded-full flex flex-col items-center justify-center border-4"
                    style={{ borderColor: scoreColor(matchResult.score), background: scoreBg(matchResult.score) }}>
                    <span className="text-3xl font-bold" style={{ color: scoreColor(matchResult.score) }}>
                      {matchResult.score}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: scoreColor(matchResult.score) }}>/ 100</span>
                  </div>
                  <div className="flex-1">
                    {/* Score balk */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Matchscore</span>
                      <span className="font-semibold" style={{ color: scoreColor(matchResult.score) }}>
                        {matchResult.score >= 70 ? "Sterke match 🟢" : matchResult.score >= 40 ? "Gemiddelde match 🟡" : "Zwakke match 🔴"}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${matchResult.score}%`, background: scoreColor(matchResult.score) }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">AI Uitleg</p>
                  <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4">{matchResult.explanation}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
