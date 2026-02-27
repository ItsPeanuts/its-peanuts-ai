"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getMyApplications, getApplicationAIResult, ApplicationWithDetails, AIResult } from "@/lib/api";
import { clearSession, getToken, getRole } from "@/lib/session";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  applied:     { label: "In behandeling", color: "#6b7280", bg: "#f3f4f6" },
  shortlisted: { label: "Geselecteerd",   color: "#1d4ed8", bg: "#dbeafe" },
  interview:   { label: "Interview",      color: "#d97706", bg: "#fef3c7" },
  hired:       { label: "Aangenomen",     color: "#059669", bg: "#d1fae5" },
  rejected:    { label: "Afgewezen",      color: "#dc2626", bg: "#fee2e2" },
};

const NAV_ITEMS = [
  { label: "Dashboard", href: "/candidate" },
  { label: "Sollicitaties", href: "/candidate/sollicitaties" },
  { label: "CV Beheer", href: "/candidate/cv" },
  { label: "Vacatures", href: "/vacatures" },
];

export default function SollicitatieDetailPage() {
  const router = useRouter();
  const params = useParams();
  const appId = Number(params?.id);

  const token = useMemo(() => getToken(), []);
  const role = useMemo(() => getRole(), []);

  const [app, setApp] = useState<ApplicationWithDetails | null>(null);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { router.replace("/candidate/login"); return; }
    if (role && role !== "candidate") { router.replace("/employer"); return; }
    if (!appId) { router.replace("/candidate/sollicitaties"); return; }

    (async () => {
      try {
        const apps = await getMyApplications(token);
        const found = apps.find((a) => a.application_id === appId);
        if (!found) {
          router.replace("/candidate/sollicitaties");
          return;
        }
        setApp(found);

        try {
          const ai = await getApplicationAIResult(token, appId);
          setAiResult(ai);
        } catch {
          // Geen AI-resultaat beschikbaar, dat is oké
        }
      } catch (e: unknown) {
        if ((e as Error)?.message?.includes("401") || (e as Error)?.message?.includes("403")) {
          clearSession();
          router.replace("/candidate/login");
        } else {
          setError((e as Error)?.message || "Kon sollicitatie niet laden");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router, token, role, appId]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui" }}>
        <div style={{ color: "#6b7280", fontSize: 16 }}>Laden...</div>
      </div>
    );
  }

  const status = app ? (STATUS_MAP[app.status] ?? { label: app.status, color: "#374151", bg: "#f3f4f6" }) : null;
  const scoreColor = aiResult?.match_score != null
    ? aiResult.match_score >= 70 ? "#059669" : aiResult.match_score >= 40 ? "#d97706" : "#dc2626"
    : "#9ca3af";
  const scoreBg = aiResult?.match_score != null
    ? aiResult.match_score >= 70 ? "#d1fae5" : aiResult.match_score >= 40 ? "#fef3c7" : "#fee2e2"
    : "#f3f4f6";

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 60,
      }}>
        <a href="/" style={{ fontWeight: 800, fontSize: 20, color: "#0A66C2", textDecoration: "none" }}>ItsPeanuts AI</a>
        <div style={{ display: "flex", gap: 4 }}>
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 14, fontWeight: 500,
              color: "#374151", textDecoration: "none", background: "transparent",
            }}>
              {item.label}
            </a>
          ))}
          <button onClick={() => { clearSession(); router.push("/"); }} style={{
            padding: "8px 14px", borderRadius: 8, fontSize: 14, fontWeight: 500,
            color: "#dc2626", background: "transparent", border: "none", cursor: "pointer",
          }}>
            Uitloggen
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
        {/* Terug link */}
        <a href="/candidate/sollicitaties" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 14, color: "#6b7280", textDecoration: "none", marginBottom: 24,
          fontWeight: 500,
        }}>
          ← Terug naar sollicitaties
        </a>

        {error && (
          <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
            {error}
          </div>
        )}

        {app && (
          <>
            {/* Header kaart */}
            <div style={{
              background: "#fff",
              borderRadius: 16,
              padding: "28px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 20,
            }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>
                  {app.vacancy_title}
                </h1>
                <div style={{ fontSize: 14, color: "#6b7280" }}>
                  {app.vacancy_location || "Locatie onbekend"} · Gesolliciteerd op {new Date(app.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, flexShrink: 0 }}>
                {status && (
                  <span style={{
                    padding: "5px 14px",
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    color: status.color,
                    background: status.bg,
                  }}>
                    {status.label}
                  </span>
                )}
                <a
                  href={`/vacatures/${app.vacancy_id}`}
                  style={{
                    fontSize: 13,
                    color: "#0A66C2",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  Vacature bekijken →
                </a>
              </div>
            </div>

            {/* AI Analyse */}
            {aiResult ? (
              <div style={{
                background: "#fff",
                borderRadius: 16,
                padding: "28px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                marginBottom: 20,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 }}>AI-analyse</h2>
                  {aiResult.match_score != null && (
                    <div style={{
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      background: scoreBg,
                      border: `3px solid ${scoreColor}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 800,
                      color: scoreColor,
                    }}>
                      {aiResult.match_score}
                    </div>
                  )}
                </div>

                {aiResult.summary && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Samenvatting</div>
                    <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.6, background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
                      {aiResult.summary}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {aiResult.strengths && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#059669", marginBottom: 6 }}>Sterke punten</div>
                      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, background: "#f0fdf4", borderRadius: 10, padding: "12px 14px" }}>
                        {aiResult.strengths}
                      </div>
                    </div>
                  )}
                  {aiResult.gaps && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#d97706", marginBottom: 6 }}>Aandachtspunten</div>
                      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, background: "#fffbeb", borderRadius: 10, padding: "12px 14px" }}>
                        {aiResult.gaps}
                      </div>
                    </div>
                  )}
                </div>

                {aiResult.suggested_questions && (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#7c3aed", marginBottom: 6 }}>Mogelijke interviewvragen</div>
                    <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, background: "#f5f3ff", borderRadius: 10, padding: "12px 14px" }}>
                      {aiResult.suggested_questions}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: "#fff",
                borderRadius: 16,
                padding: "28px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                marginBottom: 20,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Nog geen AI-analyse</div>
                <div style={{ fontSize: 13, color: "#9ca3af" }}>
                  De AI-analyse wordt uitgevoerd zodra je sollicitatie is verwerkt.
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
