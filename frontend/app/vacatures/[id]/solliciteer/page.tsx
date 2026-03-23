"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  applyToVacancyAuthenticated, generateMotivationLetter,
  getVacancy, getCandidateCVs, PublicVacancyDetail,
} from "@/lib/api";
import { getToken, getRole } from "@/lib/session";

interface Answer { question_id: number; answer: string; }

// ── Stap-indicator ──────────────────────────────────────────────
function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div style={{ padding: "16px 28px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center" }}>
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : undefined }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: done || active ? "#7C3AED" : "#f3f4f6",
                color: done || active ? "#fff" : "#9ca3af",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {done ? "✓" : n}
              </div>
              <span style={{ fontSize: 11, color: active ? "#7C3AED" : done ? "#374151" : "#9ca3af", fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? "#7C3AED" : "#e5e7eb", margin: "0 8px", marginBottom: 20 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Hoofd component ──────────────────────────────────────────────
export default function SolliciteerPage({ params }: { params: { id: string } }) {
  const vacancyId = parseInt(params.id);
  const token = useMemo(() => getToken(), []);
  const role  = useMemo(() => getRole(), []);
  const isLoggedIn = !!token && (role === "candidate" || role === "admin");

  const [vacancy, setVacancy]     = useState<PublicVacancyDetail | null>(null);
  const [hasCV, setHasCV]         = useState(false);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const [step, setStep] = useState(1);

  // Motivatiebrief
  const [motivation, setMotivation]       = useState("");
  const [genLoading, setGenLoading]       = useState(false);

  // Intake
  const [answers, setAnswers] = useState<Answer[]>([]);

  // Resultaat
  const [result, setResult] = useState<{ match_score: number; explanation: string; application_id: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [v, cvs] = await Promise.all([
          getVacancy(vacancyId),
          isLoggedIn && token ? getCandidateCVs(token).catch(() => []) : Promise.resolve([]),
        ]);
        setVacancy(v as PublicVacancyDetail);
        setAnswers((v as PublicVacancyDetail).intake_questions.map((q: { id: number }) => ({ question_id: q.id, answer: "" })));
        if (isLoggedIn) setHasCV((cvs as []).length > 0);
      } catch { /* gebruik mock */ }
      setLoading(false);
    };
    load();
  }, [vacancyId, isLoggedIn, token]);

  const hasIntake = (vacancy?.intake_questions.length ?? 0) > 0;

  // Stap-definities (altijd ingelogde flow)
  const steps = hasIntake ? ["Motivatie", "Vragen", "Klaar"] : ["Motivatie", "Klaar"];
  const totalSteps = steps.length - 1; // laatste stap = resultaat

  // ── Navigatie ──
  const handleNext = async () => {
    setError(null);

    // Als dit de laatste echte stap is → submit
    if (step === totalSteps) {
      await handleSubmit();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (token) {
        const intakeJson = JSON.stringify(answers);
        const res = await applyToVacancyAuthenticated(token, vacancyId, {
          motivation_letter: motivation || undefined,
          intake_answers_json: intakeJson,
        });
        setResult({ match_score: res.match_score, explanation: res.explanation, application_id: res.application_id });
      }
      setStep(steps.length); // resultaat-stap
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sollicitatie mislukt. Probeer opnieuw.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateMotivation = async () => {
    if (!token) return;
    setGenLoading(true);
    setError(null);
    try {
      const letter = await generateMotivationLetter(token, vacancyId);
      setMotivation(letter);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Genereren mislukt");
    } finally {
      setGenLoading(false);
    }
  };

  // ── Stap-nummers (1-based, relatief aan login-status) ──
  const gStep = (label: string) => steps.indexOf(label) + 1;

  // ── Score kleur ──
  const scoreColor = result
    ? result.match_score >= 70 ? "#059669" : result.match_score >= 40 ? "#d97706" : "#dc2626"
    : "#6b7280";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>Laden...</div>
      </div>
    );
  }

  // Niet ingelogd → stuur naar registratie/login
  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "40px 32px", maxWidth: 400, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, background: "linear-gradient(135deg, #7C3AED, #0891b2)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24 }}>
            👤
          </div>
          <div style={{ fontWeight: 700, color: "#111827", fontSize: 17, marginBottom: 8 }}>
            Maak eerst een profiel aan
          </div>
          <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
            Om te solliciteren op <strong>{vacancy?.title ?? "deze vacature"}</strong> heb je een kandidaatprofiel nodig met je CV.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link
              href={`/candidate/login?tab=register&next=/vacatures/${vacancyId}/solliciteer`}
              style={{ display: "block", padding: "12px 24px", background: "#7C3AED", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none" }}
            >
              Account aanmaken
            </Link>
            <Link
              href={`/candidate/login?next=/vacatures/${vacancyId}/solliciteer`}
              style={{ display: "block", padding: "12px 24px", background: "#f3f4f6", color: "#374151", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none" }}
            >
              Al een account? Inloggen
            </Link>
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 16 }}>
            Na het aanmaken van je profiel en het uploaden van je CV kun je direct solliciteren.
          </p>
        </div>
      </div>
    );
  }

  // Ingelogd maar geen CV → stuur naar CV-pagina
  if (isLoggedIn && !hasCV) {
    return (
      <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "40px 32px", maxWidth: 400, textAlign: "center" }}>
          <div style={{ fontWeight: 700, color: "#111827", fontSize: 16, marginBottom: 8 }}>
            Upload eerst je CV
          </div>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
            Om te solliciteren heb je een CV nodig in je profiel. Upload het eenmalig en solliciteer daarna met één klik.
          </p>
          <Link
            href={`/candidate/cv?next=/vacatures/${vacancyId}/solliciteer`}
            style={{ display: "inline-block", padding: "10px 24px", background: "#7C3AED", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
          >
            CV uploaden
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh", padding: "32px 16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* Terug */}
        <div style={{ marginBottom: 20 }}>
          <Link href={`/vacatures/${vacancyId}`} style={{ fontSize: 13, color: "#7C3AED", textDecoration: "none", fontWeight: 500 }}>
            ← Terug naar vacature
          </Link>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ padding: "20px 28px", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Sollicitatie
            </div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 }}>
              {vacancy?.title ?? "Vacature laden..."}
            </h1>
            {isLoggedIn && (
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669" }} />
                <span style={{ fontSize: 12, color: "#059669", fontWeight: 500 }}>Ingelogd — je gegevens en CV worden automatisch gebruikt</span>
              </div>
            )}
          </div>

          {/* Stap-indicator (niet op resultaat-stap) */}
          {step < steps.length && (
            <StepIndicator steps={steps.slice(0, -1)} current={step} />
          )}

          {/* Inhoud */}
          <div style={{ padding: "28px" }}>

            {/* Foutmelding */}
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13, marginBottom: 20 }}>
                {error}
              </div>
            )}

            {/* ── STAP: Motivatiebrief ── */}
            {step === gStep("Motivatie") && (
              <div>
                <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>
                  Optioneel — sla over als je wilt, of laat AI er een schrijven op basis van je CV.
                </p>
                <textarea
                  value={motivation}
                  onChange={e => setMotivation(e.target.value)}
                  placeholder="Schrijf hier je motivatie, of laat AI helpen..."
                  rows={8}
                  style={{ width: "100%", padding: "12px 14px", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 14, color: "#111827", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.6 }}
                  onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = "#7C3AED"}
                  onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = "#e5e7eb"}
                />
                {isLoggedIn && (
                  <button
                    onClick={handleGenerateMotivation}
                    disabled={genLoading}
                    style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "#f0fdfa", border: "1px solid #ccfbf1", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#7C3AED", cursor: genLoading ? "not-allowed" : "pointer", opacity: genLoading ? 0.7 : 1 }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {genLoading ? "Bezig met schrijven..." : "AI schrijft motivatiebrief"}
                  </button>
                )}
              </div>
            )}

            {/* ── STAP: Screeningsvragen ── */}
            {step === gStep("Vragen") && vacancy && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Beantwoord de vragen van de werkgever.</p>
                {vacancy.intake_questions.map((q, index) => (
                  <div key={q.id}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>{q.question}</label>
                    {q.qtype === "yes_no" ? (
                      <div style={{ display: "flex", gap: 16 }}>
                        {["Ja", "Nee"].map(opt => (
                          <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}>
                            <input type="radio" name={`q_${q.id}`} value={opt} checked={answers[index]?.answer === opt} onChange={() => {
                              const u = [...answers]; u[index] = { question_id: q.id, answer: opt }; setAnswers(u);
                            }} style={{ accentColor: "#7C3AED" }} />
                            {opt}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        rows={3} placeholder="Jouw antwoord..." value={answers[index]?.answer ?? ""}
                        onChange={e => { const u = [...answers]; u[index] = { question_id: q.id, answer: e.target.value }; setAnswers(u); }}
                        style={{ width: "100%", padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 14, color: "#111827", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                        onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = "#7C3AED"}
                        onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = "#e5e7eb"}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── STAP: Resultaat ── */}
            {step === steps.length && result && (
              <div style={{ textAlign: "center" }}>
                {/* Score */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ width: 100, height: 100, borderRadius: "50%", border: `6px solid ${scoreColor}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28, fontWeight: 800, color: scoreColor }}>
                    {result.match_score}%
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
                    {result.match_score >= 70 ? "Sterke match!" : result.match_score >= 40 ? "Redelijke match" : "Sollicitatie ingediend"}
                  </h2>
                  <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, maxWidth: 420, margin: "0 auto" }}>
                    {result.explanation}
                  </p>
                </div>

                {/* Bevestiging */}
                <div style={{ background: "#f0fdfa", border: "1px solid #ccfbf1", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#134e4a", marginBottom: 20, textAlign: "left" }}>
                  Je sollicitatie (#{result.application_id}) is ingediend. De werkgever neemt contact op als je bent geselecteerd.
                </div>

                {/* Interview opties */}
                {(() => {
                  const iType = vacancy?.interview_type ?? "both";
                  const ePlan = vacancy?.employer_plan ?? "gratis";
                  const showChat    = iType === "chat" || iType === "both";
                  const showVirtual = (iType === "virtual" || iType === "both") && ePlan === "premium";
                  return (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12, textAlign: "left" }}>
                        Volgende stap — start je gesprek met Lisa:
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {showChat && (
                          <Link
                            href={`/candidate/sollicitaties/${result.application_id}/chat`}
                            style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", background: "#7C3AED", color: "#fff", borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: "none" }}
                          >
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🗨️</div>
                            <div style={{ textAlign: "left" }}>
                              <div>Chat met Lisa</div>
                              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>AI-recruiter stelt je 3 vragen</div>
                            </div>
                          </Link>
                        )}
                        {showVirtual && (
                          <Link
                            href={`/candidate/interview/${result.application_id}`}
                            style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: "none" }}
                          >
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🎥</div>
                            <div style={{ textAlign: "left" }}>
                              <div>Video interview met Lisa</div>
                              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>AI avatar stelt je 4 vragen live</div>
                            </div>
                          </Link>
                        )}
                        {!showChat && !showVirtual && (
                          <div style={{ padding: "14px 20px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, fontSize: 13, color: "#6b7280" }}>
                            De werkgever neemt contact met je op voor een gesprek.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Secundaire acties */}
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <Link href="/vacatures" style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, fontWeight: 500, color: "#374151", background: "#fff", textDecoration: "none" }}>
                    Meer vacatures
                  </Link>
                  <Link href="/candidate" style={{ padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#7C3AED", background: "#f0fdfa", textDecoration: "none" }}>
                    Mijn portaal
                  </Link>
                </div>
              </div>
            )}

            {/* ── Navigatieknoppen ── */}
            {step < steps.length && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, paddingTop: 20, borderTop: "1px solid #f3f4f6" }}>
                {step > 1 ? (
                  <button
                    onClick={() => { setError(null); setStep(s => s - 1); }}
                    disabled={submitting}
                    style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer" }}
                  >
                    Terug
                  </button>
                ) : <div />}

                <button
                  onClick={handleNext}
                  disabled={submitting}
                  style={{ padding: "10px 28px", borderRadius: 10, background: "#7C3AED", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, minWidth: 140 }}
                >
                  {submitting ? "Bezig..."
                    : step === totalSteps ? "Solliciteer nu"
                    : step === gStep("Motivatie") ? "Volgende"
                    : "Volgende"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
