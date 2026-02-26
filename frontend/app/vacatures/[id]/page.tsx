"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getVacancy, PublicVacancyDetail } from "@/lib/api";

export default function VacatureDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [vacancy, setVacancy] = useState<PublicVacancyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getVacancy(parseInt(params.id))
      .then(setVacancy)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <main className="main">
        <div className="container" style={{ textAlign: "center", padding: "60px" }}>
          <p>⏳ Vacature laden...</p>
        </div>
      </main>
    );
  }

  if (error || !vacancy) {
    return (
      <main className="main">
        <div className="container">
          <div className="error-box">{error || "Vacature niet gevonden"}</div>
          <Link
            href="/vacatures"
            className="btn btn-secondary"
            style={{ marginTop: "16px", display: "inline-block" }}
          >
            ← Terug naar overzicht
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="main">
      <div className="container">
        <Link
          href="/vacatures"
          style={{
            color: "var(--primary)",
            textDecoration: "none",
            fontSize: "0.9rem",
          }}
        >
          ← Terug naar vacatures
        </Link>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gap: "24px",
            marginTop: "16px",
            alignItems: "start",
          }}
        >
          {/* Hoofdinhoud */}
          <section className="card">
            <div className="card-header">
              <h1 style={{ fontSize: "1.8rem", marginBottom: "10px" }}>
                {vacancy.title}
              </h1>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  flexWrap: "wrap",
                  color: "var(--text-secondary)",
                  fontSize: "0.95rem",
                }}
              >
                {vacancy.location && <span>📍 {vacancy.location}</span>}
                {vacancy.hours_per_week && (
                  <span>🕐 {vacancy.hours_per_week}</span>
                )}
                {vacancy.salary_range && <span>💰 {vacancy.salary_range}</span>}
              </div>
            </div>

            {vacancy.description && (
              <div
                style={{
                  marginTop: "24px",
                  lineHeight: "1.75",
                  whiteSpace: "pre-wrap",
                  color: "var(--text-primary)",
                }}
              >
                {vacancy.description}
              </div>
            )}

            {vacancy.intake_questions.length > 0 && (
              <div
                style={{
                  marginTop: "32px",
                  paddingTop: "24px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <h3 style={{ marginBottom: "8px" }}>📋 Screeningsvragen</h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                    marginBottom: "12px",
                  }}
                >
                  Bij je sollicitatie word je gevraagd deze vragen te
                  beantwoorden.
                </p>
                <ul style={{ paddingLeft: "20px" }}>
                  {vacancy.intake_questions.map((q) => (
                    <li key={q.id} style={{ marginBottom: "8px" }}>
                      {q.question}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Sidebar */}
          <aside>
            <div
              className="card"
              style={{ position: "sticky", top: "24px" }}
            >
              <div className="card-header">
                <h3>Solliciteer nu</h3>
                <p className="card-description">
                  AI pre-screening in 2 minuten
                </p>
              </div>
              <Link
                href={`/vacatures/${vacancy.id}/solliciteer`}
                className="btn btn-primary btn-full"
                style={{
                  display: "block",
                  textAlign: "center",
                  textDecoration: "none",
                  padding: "12px",
                }}
              >
                🚀 Solliciteer met AI
              </Link>

              <div
                style={{
                  marginTop: "16px",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                }}
              >
                {vacancy.location && <p>📍 {vacancy.location}</p>}
                {vacancy.hours_per_week && (
                  <p style={{ marginTop: "4px" }}>🕐 {vacancy.hours_per_week}</p>
                )}
                {vacancy.salary_range && (
                  <p style={{ marginTop: "4px" }}>💰 {vacancy.salary_range}</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
