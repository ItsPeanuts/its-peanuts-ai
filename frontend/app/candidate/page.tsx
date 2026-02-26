"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { me, getMyApplications, ApplicationWithDetails } from "@/lib/api";
import { clearSession, getToken, getRole } from "@/lib/session";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  applied:     { label: "In behandeling", color: "#6b7280", bg: "#f3f4f6" },
  shortlisted: { label: "Geselecteerd",   color: "#1d4ed8", bg: "#dbeafe" },
  interview:   { label: "Interview",      color: "#d97706", bg: "#fef3c7" },
  hired:       { label: "Aangenomen",     color: "#059669", bg: "#d1fae5" },
  rejected:    { label: "Afgewezen",      color: "#dc2626", bg: "#fee2e2" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, color: "#374151", bg: "#f3f4f6" };
  return (
    <span style={{
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      color: s.color,
      background: s.bg,
    }}>
      {s.label}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span style={{ fontSize: 12, color: "#9ca3af" }}>—</span>;
  const color = score >= 70 ? "#059669" : score >= 40 ? "#d97706" : "#dc2626";
  return (
    <span style={{
      fontWeight: 700,
      fontSize: 14,
      color,
      background: "#f9fafb",
      padding: "3px 10px",
      borderRadius: 20,
      border: `1.5px solid ${color}`,
    }}>
      {score}%
    </span>
  );
}

export default function CandidateDashboard() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const role = useMemo(() => getRole(), []);

  const [userName, setUserName] = useState("");
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.replace("/candidate/login");
      return;
    }
    if (role && role !== "candidate") {
      router.replace("/employer");
      return;
    }
    (async () => {
      try {
        const [user, apps] = await Promise.all([
          me(token),
          getMyApplications(token),
        ]);
        setUserName(user.full_name || user.email);
        setApplications(apps);
      } catch {
        clearSession();
        router.replace("/candidate/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, token, role]);

  const stats = {
    total: applications.length,
    inProgress: applications.filter((a) => a.status === "applied" || a.status === "shortlisted").length,
    interview: applications.filter((a) => a.status === "interview").length,
    avgScore: (() => {
      const scored = applications.filter((a) => a.match_score !== null);
      if (!scored.length) return null;
      return Math.round(scored.reduce((s, a) => s + (a.match_score ?? 0), 0) / scored.length);
    })(),
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui" }}>
        <div style={{ color: "#6b7280", fontSize: 16 }}>Laden...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Top nav */}
      <nav style={{
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 60,
      }}>
        <a href="/" style={{ fontWeight: 800, fontSize: 20, color: "#0A66C2", textDecoration: "none", letterSpacing: -0.5 }}>
          ItsPeanuts AI
        </a>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { label: "Dashboard", href: "/candidate" },
            { label: "Sollicitaties", href: "/candidate/sollicitaties" },
            { label: "CV Beheer", href: "/candidate/cv" },
            { label: "Vacatures", href: "/vacatures" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                color: "#374151",
                textDecoration: "none",
                background: "transparent",
              }}
            >
              {item.label}
            </a>
          ))}
          <button
            onClick={() => { clearSession(); router.push("/"); }}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              color: "#dc2626",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            Uitloggen
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px" }}>
        {/* Welkomst header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: 0 }}>
            Welkom terug, {userName.split(" ")[0]}
          </h1>
          <p style={{ color: "#6b7280", margin: "6px 0 0", fontSize: 15 }}>
            Dit is je sollicitatie-dashboard. Hier zie je al je activiteit in een oogopslag.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Totaal", value: stats.total, color: "#0A66C2", bg: "#eff6ff" },
            { label: "In behandeling", value: stats.inProgress, color: "#d97706", bg: "#fffbeb" },
            { label: "Interview", value: stats.interview, color: "#7c3aed", bg: "#f5f3ff" },
            { label: "Gem. AI-score", value: stats.avgScore !== null ? `${stats.avgScore}%` : "—", color: "#059669", bg: "#ecfdf5" },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: "#fff",
              borderRadius: 16,
              padding: "20px 22px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              borderLeft: `4px solid ${stat.color}`,
            }}>
              <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500, marginBottom: 8 }}>{stat.label}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
          {/* Recente sollicitaties */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 }}>Recente sollicitaties</h2>
              <a href="/candidate/sollicitaties" style={{ fontSize: 13, color: "#0A66C2", textDecoration: "none", fontWeight: 600 }}>
                Alle bekijken →
              </a>
            </div>

            {applications.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>Nog geen sollicitaties</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>Bekijk openstaande vacatures en solliciteer!</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {applications.slice(0, 3).map((app) => (
                  <a
                    key={app.application_id}
                    href={`/candidate/sollicitaties/${app.application_id}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 16px",
                      background: "#f8fafc",
                      borderRadius: 12,
                      textDecoration: "none",
                      border: "1px solid #e5e7eb",
                      transition: "background 0.1s",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#111827", fontSize: 14 }}>{app.vacancy_title}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                        {app.vacancy_location || "Locatie onbekend"} · {new Date(app.created_at).toLocaleDateString("nl-NL")}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <ScoreBadge score={app.match_score} />
                      <StatusBadge status={app.status} />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Snelle acties */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Snelle acties</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <a
                  href="/vacatures"
                  style={{
                    display: "block",
                    padding: "13px 16px",
                    background: "linear-gradient(135deg, #0A66C2, #0952a0)",
                    color: "#fff",
                    borderRadius: 12,
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: 14,
                    textAlign: "center",
                    boxShadow: "0 2px 10px rgba(10,102,194,0.25)",
                  }}
                >
                  Zoek vacatures
                </a>
                <a
                  href="/candidate/cv"
                  style={{
                    display: "block",
                    padding: "13px 16px",
                    background: "#fff",
                    color: "#0A66C2",
                    border: "1.5px solid #0A66C2",
                    borderRadius: 12,
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: 14,
                    textAlign: "center",
                  }}
                >
                  Upload CV
                </a>
              </div>
            </div>

            <div style={{
              background: "linear-gradient(135deg, #0A66C2 0%, #7c3aed 100%)",
              borderRadius: 16,
              padding: "20px",
              color: "#fff",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, marginBottom: 8 }}>AI-gestuurde matching</div>
              <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.5 }}>
                Onze AI analyseert jouw CV en matcht het met vacatures voor de beste kansen.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
