"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { applyToVacancy, getVacancy, PublicVacancyDetail } from "@/lib/api";
import { setSession } from "@/lib/session";

type Step = 1 | 2 | 3 | 4;

interface Answer {
  question_id: number;
  answer: string;
}

const STEPS = ["Gegevens", "CV", "Vragen", "Resultaat"];

export default function SolliciteerPage({ params }: { params: { id: string } }) {
  const vacancyId = parseInt(params.id);

  const [vacancy, setVacancy] = useState<PublicVacancyDetail | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stap 1
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Stap 2
  const [cvFile, setCvFile] = useState<File | null>(null);

  // Stap 3
  const [answers, setAnswers] = useState<Answer[]>([]);

  // Stap 4
  const [result, setResult] = useState<{
    match_score: number;
    explanation: string;
    application_id: number;
  } | null>(null);

  useEffect(() => {
    getVacancy(vacancyId)
      .then((v) => {
        setVacancy(v);
        setAnswers(v.intake_questions.map((q) => ({ question_id: q.id, answer: "" })));
      })
      .catch(() => {});
  }, [vacancyId]);

  const hasIntake = (vacancy?.intake_questions.length ?? 0) > 0;
  const totalSteps = hasIntake ? 3 : 2;
  const visibleSteps = hasIntake ? STEPS : ["Gegevens", "CV", "Resultaat"];

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!fullName.trim()) return "Vul je volledige naam in.";
      if (!email.includes("@")) return "Vul een geldig e-mailadres in.";
      if (password.length < 8) return "Wachtwoord moet minimaal 8 tekens bevatten.";
    }
    if (step === 2) {
      if (!cvFile) return "Upload je CV (PDF of DOCX).";
    }
    return null;
  };

  const handleNext = async () => {
    setError(null);
    const err = validateStep();
    if (err) { setError(err); return; }

    if (step === 2 && !hasIntake) {
      await handleSubmit();
    } else if (step === 3) {
      await handleSubmit();
    } else {
      setStep(((step as number) + 1) as Step);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const formData = new FormData();
    formData.append("full_name", fullName);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("cv_file", cvFile!);
    formData.append("intake_answers_json", JSON.stringify(answers));
    try {
      const res = await applyToVacancy(vacancyId, formData);
      setSession({ token: res.access_token, role: "candidate", email });
      setResult({ match_score: res.match_score, explanation: res.explanation, application_id: res.application_id });
      setStep(4);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sollicitatie mislukt. Probeer opnieuw.");
    } finally {
      setSubmitting(false);
    }
  };

  const scoreColor =
    result
      ? result.match_score >= 70 ? "#059669"
        : result.match_score >= 40 ? "#d97706"
        : "#dc2626"
      : "#6b7280";

  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh", padding: "32px 16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: 20 }}>
          <Link
            href={`/vacatures/${vacancyId}`}
            style={{ fontSize: 13, color: "#0f766e", textDecoration: "none", fontWeight: 500 }}
          >
            ← Terug naar vacature
          </Link>
        </div>

        {/* Kaart */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ padding: "24px 28px", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Sollicitatie
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>
              {vacancy?.title ?? "Vacature laden..."}
            </h1>
          </div>

          {/* Stap-indicator */}
          {step < 4 && (
            <div style={{ padding: "16px 28px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 0 }}>
              {visibleSteps.map((label, i) => {
                const stepNum = i + 1;
                const isActive = stepNum === (step > totalSteps ? totalSteps : step);
                const isDone = stepNum < step;
                return (
                  <div key={label} style={{ display: "flex", alignItems: "center", flex: i < visibleSteps.length - 1 ? 1 : undefined }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: isDone ? "#0f766e" : isActive ? "#0f766e" : "#f3f4f6",
                        color: isDone || isActive ? "#fff" : "#9ca3af",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}>
                        {isDone ? "✓" : stepNum}
                      </div>
                      <span style={{ fontSize: 11, color: isActive ? "#0f766e" : isDone ? "#374151" : "#9ca3af", fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap" }}>
                        {label}
                      </span>
                    </div>
                    {i < visibleSteps.length - 1 && (
                      <div style={{ flex: 1, height: 1, background: isDone ? "#0f766e" : "#e5e7eb", margin: "0 8px", marginBottom: 20 }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Inhoud */}
          <div style={{ padding: "28px" }}>

            {/* Foutmelding */}
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13, marginBottom: 20 }}>
                {error}
              </div>
            )}

            {/* Stap 1: Persoonsgegevens */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                    Volledige naam
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jan de Vries"
                    autoFocus
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box" }}
                    onFocus={e => (e.target as HTMLInputElement).style.borderColor = "#0f766e"}
                    onBlur={e => (e.target as HTMLInputElement).style.borderColor = "#e5e7eb"}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                    E-mailadres
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jan@email.nl"
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box" }}
                    onFocus={e => (e.target as HTMLInputElement).style.borderColor = "#0f766e"}
                    onBlur={e => (e.target as HTMLInputElement).style.borderColor = "#e5e7eb"}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                    Wachtwoord <span style={{ color: "#9ca3af", fontWeight: 400 }}>(minimaal 8 tekens)</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box" }}
                    onFocus={e => (e.target as HTMLInputElement).style.borderColor = "#0f766e"}
                    onBlur={e => (e.target as HTMLInputElement).style.borderColor = "#e5e7eb"}
                  />
                </div>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                  Al een account?{" "}
                  <Link href="/candidate/login" style={{ color: "#0f766e", fontWeight: 600, textDecoration: "none" }}>
                    Log hier in
                  </Link>
                </p>
              </div>
            )}

            {/* Stap 2: CV uploaden */}
            {step === 2 && (
              <div>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, margin: "0 0 16px" }}>
                  Je CV wordt gebruikt voor de AI-matching. PDF, DOCX of TXT (max 10 MB).
                </p>
                <div
                  onClick={() => document.getElementById("cv-input")?.click()}
                  style={{
                    border: `2px dashed ${cvFile ? "#0f766e" : "#d1d5db"}`,
                    borderRadius: 12,
                    padding: "40px 24px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: cvFile ? "#f0fdfa" : "#fafafa",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { if (!cvFile) (e.currentTarget as HTMLElement).style.borderColor = "#0f766e"; }}
                  onMouseLeave={e => { if (!cvFile) (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"; }}
                >
                  {cvFile ? (
                    <div>
                      <div style={{ width: 40, height: 40, background: "#0f766e", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                        <svg width="20" height="20" fill="none" stroke="#fff" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p style={{ fontWeight: 600, color: "#0f766e", fontSize: 14, margin: "0 0 4px" }}>{cvFile.name}</p>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Klik om een ander bestand te kiezen</p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ width: 40, height: 40, background: "#f3f4f6", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                        <svg width="20" height="20" fill="none" stroke="#9ca3af" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </div>
                      <p style={{ fontWeight: 600, color: "#374151", fontSize: 14, margin: "0 0 4px" }}>Klik om je CV te uploaden</p>
                      <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>PDF, DOCX of TXT</p>
                    </div>
                  )}
                </div>
                <input
                  id="cv-input"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  style={{ display: "none" }}
                  onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                />
              </div>
            )}

            {/* Stap 3: Screeningsvragen */}
            {step === 3 && vacancy && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                  Beantwoord de vragen van de werkgever.
                </p>
                {vacancy.intake_questions.map((q, index) => (
                  <div key={q.id}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                      {q.question}
                    </label>
                    {q.qtype === "yes_no" ? (
                      <div style={{ display: "flex", gap: 16 }}>
                        {["Ja", "Nee"].map((option) => (
                          <label
                            key={option}
                            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}
                          >
                            <input
                              type="radio"
                              name={`q_${q.id}`}
                              value={option}
                              checked={answers[index]?.answer === option}
                              onChange={() => {
                                const updated = [...answers];
                                updated[index] = { question_id: q.id, answer: option };
                                setAnswers(updated);
                              }}
                              style={{ accentColor: "#0f766e" }}
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        rows={3}
                        placeholder="Jouw antwoord..."
                        value={answers[index]?.answer ?? ""}
                        onChange={(e) => {
                          const updated = [...answers];
                          updated[index] = { question_id: q.id, answer: e.target.value };
                          setAnswers(updated);
                        }}
                        style={{
                          width: "100%", padding: "10px 14px", border: "1px solid #e5e7eb",
                          borderRadius: 10, fontSize: 14, color: "#111827", outline: "none",
                          resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
                        }}
                        onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = "#0f766e"}
                        onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = "#e5e7eb"}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Stap 4: Resultaat */}
            {step === 4 && result && (
              <div style={{ textAlign: "center" }}>
                {/* Score */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{
                    width: 100, height: 100, borderRadius: "50%",
                    border: `6px solid ${scoreColor}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 16px",
                    fontSize: 28, fontWeight: 800, color: scoreColor,
                  }}>
                    {result.match_score}%
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
                    {result.match_score >= 70
                      ? "Sterke match!"
                      : result.match_score >= 40
                      ? "Redelijke match"
                      : "Sollicitatie ingediend"}
                  </h2>
                  <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, maxWidth: 420, margin: "0 auto" }}>
                    {result.explanation}
                  </p>
                </div>

                {/* Bevestiging */}
                <div style={{ background: "#f0fdfa", border: "1px solid #ccfbf1", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#134e4a", marginBottom: 20, textAlign: "left" }}>
                  Je sollicitatie (#{result.application_id}) is ingediend. De werkgever neemt contact op via {email}.
                </div>

                {/* Chat met Lisa */}
                <div style={{
                  background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12,
                  padding: "16px 20px", marginBottom: 24,
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, textAlign: "left",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", background: "#0f766e",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 800, fontSize: 16, flexShrink: 0,
                    }}>L</div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#111827", fontSize: 13, marginBottom: 2 }}>
                        Lisa wil je leren kennen
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        Doe een kort AI-gesprek om je kansen te vergroten.
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/candidate/sollicitaties/${result.application_id}/chat`}
                    style={{
                      background: "#0f766e", color: "#fff", padding: "8px 16px",
                      borderRadius: 8, fontWeight: 600, fontSize: 13,
                      textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0,
                    }}
                  >
                    Chat met Lisa
                  </Link>
                </div>

                {/* Actieknoppen */}
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link
                    href="/vacatures"
                    style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, fontWeight: 500, color: "#374151", background: "#fff", textDecoration: "none" }}
                  >
                    Meer vacatures
                  </Link>
                  <Link
                    href="/candidate"
                    style={{ padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#fff", background: "#0f766e", textDecoration: "none" }}
                  >
                    Mijn portaal
                  </Link>
                </div>
              </div>
            )}

            {/* Navigatieknoppen */}
            {step < 4 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, paddingTop: 20, borderTop: "1px solid #f3f4f6" }}>
                {step > 1 ? (
                  <button
                    onClick={() => { setError(null); setStep(((step as number) - 1) as Step); }}
                    disabled={submitting}
                    style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer" }}
                  >
                    Terug
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={handleNext}
                  disabled={submitting}
                  style={{ padding: "10px 24px", borderRadius: 10, background: "#0f766e", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, minWidth: 140 }}
                >
                  {submitting
                    ? "Bezig..."
                    : step === totalSteps
                    ? "Solliciteer nu"
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
