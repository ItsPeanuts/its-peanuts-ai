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

export default function SolliciteerPage({
  params,
}: {
  params: { id: string };
}) {
  const vacancyId = parseInt(params.id);

  const [vacancy, setVacancy] = useState<PublicVacancyDetail | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stap 1: Persoonsgegevens
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Stap 2: CV
  const [cvFile, setCvFile] = useState<File | null>(null);

  // Stap 3: Intake antwoorden
  const [answers, setAnswers] = useState<Answer[]>([]);

  // Stap 4: Resultaat
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
    if (err) {
      setError(err);
      return;
    }

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
      setResult({
        match_score: res.match_score,
        explanation: res.explanation,
        application_id: res.application_id,
      });
      setStep(4);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Sollicitatie mislukt. Probeer opnieuw."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const scoreColor = result
    ? result.match_score >= 70
      ? "var(--secondary)"
      : result.match_score >= 40
        ? "var(--accent)"
        : "var(--danger)"
    : "var(--text-secondary)";

  const progressPct = step < 4 ? Math.round((step / totalSteps) * 100) : 100;

  return (
    <main className="main">
      <div className="container" style={{ maxWidth: "680px" }}>
        <Link
          href={`/vacatures/${vacancyId}`}
          style={{ color: "var(--primary)", textDecoration: "none", fontSize: "0.9rem" }}
        >
          ← Terug naar vacature
        </Link>

        <div className="card" style={{ marginTop: "16px" }}>
          <div className="card-header">
            <h2>🚀 Solliciteer op {vacancy?.title ?? "..."}</h2>
            {step < 4 && (
              <p className="card-description">
                Stap {step} van {totalSteps}
              </p>
            )}
          </div>

          {/* Voortgangsbalk */}
          {step < 4 && (
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: "4px",
                height: "4px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  background: "var(--primary)",
                  width: `${progressPct}%`,
                  height: "100%",
                  borderRadius: "4px",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          )}

          {error && (
            <div className="error-box" style={{ marginBottom: "16px" }}>
              {error}
            </div>
          )}

          {/* Stap 1: Persoonsgegevens */}
          {step === 1 && (
            <div>
              <h3 style={{ marginBottom: "16px" }}>👤 Persoonsgegevens</h3>
              <div className="form-group">
                <label>Volledige naam *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jan de Vries"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>E-mailadres *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jan@email.nl"
                />
              </div>
              <div className="form-group">
                <label>Wachtwoord * (minimaal 8 tekens)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "8px" }}>
                Al een account?{" "}
                <Link href="/candidate/login" style={{ color: "var(--primary)" }}>
                  Log hier in
                </Link>
              </p>
            </div>
          )}

          {/* Stap 2: CV uploaden */}
          {step === 2 && (
            <div>
              <h3 style={{ marginBottom: "8px" }}>📄 Upload je CV</h3>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.9rem",
                  marginBottom: "20px",
                }}
              >
                Je CV wordt gebruikt voor de AI-matching. We accepteren PDF, DOCX
                of TXT.
              </p>
              <div
                style={{
                  border: "2px dashed var(--primary)",
                  borderRadius: "10px",
                  padding: "40px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: cvFile ? "var(--primary-light)" : "transparent",
                  transition: "background 0.2s",
                }}
                onClick={() => document.getElementById("cv-input")?.click()}
              >
                {cvFile ? (
                  <div>
                    <p style={{ color: "var(--secondary)", fontWeight: "600", fontSize: "1rem" }}>
                      ✅ {cvFile.name}
                    </p>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                      Klik om een ander bestand te kiezen
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: "2.5rem", marginBottom: "8px" }}>📎</p>
                    <p style={{ fontWeight: "600", marginBottom: "4px" }}>
                      Klik om je CV te uploaden
                    </p>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      PDF, DOCX of TXT (max 10 MB)
                    </p>
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

          {/* Stap 3: Intake vragen */}
          {step === 3 && vacancy && (
            <div>
              <h3 style={{ marginBottom: "8px" }}>📋 Screeningsvragen</h3>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.9rem",
                  marginBottom: "20px",
                }}
              >
                Beantwoord de vragen van de werkgever.
              </p>
              {vacancy.intake_questions.map((q, index) => (
                <div key={q.id} className="form-group">
                  <label>{q.question}</label>
                  {q.qtype === "yes_no" ? (
                    <div style={{ display: "flex", gap: "24px", marginTop: "8px" }}>
                      {["Ja", "Nee"].map((option) => (
                        <label
                          key={option}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: "pointer",
                          }}
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
                        width: "100%",
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid var(--border, #d0d7de)",
                        resize: "vertical",
                        fontFamily: "inherit",
                        fontSize: "0.95rem",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Stap 4: AI resultaat */}
          {step === 4 && result && (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              {/* Score cirkel */}
              <div
                style={{
                  width: "130px",
                  height: "130px",
                  borderRadius: "50%",
                  border: `8px solid ${scoreColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  fontSize: "2.2rem",
                  fontWeight: "700",
                  color: scoreColor,
                }}
              >
                {result.match_score}%
              </div>

              <h3 style={{ marginBottom: "8px" }}>
                {result.match_score >= 70
                  ? "🎉 Sterke match!"
                  : result.match_score >= 40
                    ? "👍 Redelijke match"
                    : "📝 Sollicitatie ingediend"}
              </h3>

              <p
                style={{
                  color: "var(--text-secondary)",
                  marginBottom: "24px",
                  lineHeight: "1.65",
                  maxWidth: "480px",
                  margin: "0 auto 24px",
                }}
              >
                {result.explanation}
              </p>

              <div
                className="message-success"
                style={{ marginBottom: "24px", textAlign: "left" }}
              >
                ✅ Je sollicitatie (#{result.application_id}) is succesvol
                ingediend. De werkgever neemt contact op via {email}.
              </div>

              {/* Chat met Lisa CTA */}
              <div style={{
                background: "linear-gradient(135deg, #0DA89E15, #0891b215)",
                border: "1px solid #0DA89E40",
                borderRadius: 16,
                padding: "20px 24px",
                marginBottom: 24,
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #0DA89E, #0891b2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 18,
                    flexShrink: 0,
                  }}>L</div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#111827", fontSize: 15, marginBottom: 2 }}>
                      Lisa wil je leren kennen
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                      Doe een kort AI-gesprek (±5 min) om je kansen te vergroten.
                    </div>
                  </div>
                </div>
                <Link
                  href={`/candidate/sollicitaties/${result.application_id}/chat`}
                  style={{
                    background: "linear-gradient(135deg, #0DA89E, #0891b2)",
                    color: "#fff",
                    padding: "10px 20px",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 14,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  Chat met Lisa →
                </Link>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <Link href="/vacatures" className="btn btn-secondary">
                  Meer vacatures bekijken
                </Link>
                <Link href="/candidate" className="btn btn-primary">
                  Ga naar mijn portaal →
                </Link>
              </div>
            </div>
          )}

          {/* Navigatieknoppen */}
          {step < 4 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "28px",
                alignItems: "center",
              }}
            >
              {step > 1 ? (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setError(null);
                    setStep(((step as number) - 1) as Step);
                  }}
                  disabled={submitting}
                >
                  ← Terug
                </button>
              ) : (
                <div />
              )}
              <button
                className="btn btn-primary"
                onClick={handleNext}
                disabled={submitting}
                style={{ minWidth: "160px" }}
              >
                {submitting
                  ? "⏳ Bezig..."
                  : step === totalSteps
                    ? "🚀 Solliciteer nu"
                    : "Volgende →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
