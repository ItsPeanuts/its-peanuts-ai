"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyApplications, ApplicationWithDetails } from "@/lib/api";
import { clearSession, getToken, getRole } from "@/lib/session";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  applied:     { label: "In behandeling", color: "#6b7280", bg: "#f3f4f6" },
  shortlisted: { label: "Geselecteerd",   color: "#1d4ed8", bg: "#dbeafe" },
  interview:   { label: "Interview",      color: "#d97706", bg: "#fef3c7" },
  hired:       { label: "Aangenomen",     color: "#059669", bg: "#d1fae5" },
  rejected:    { label: "Afgewezen",      color: "#dc2626", bg: "#fee2e2" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: "#374151", bg: "#f3f4f6" };
  return (
    <span style={{
      padding: "4px 12px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      color: s.color,
      background: s.bg,
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

function ScoreCircle({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        background: "#f3f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        color: "#9ca3af",
        fontWeight: 600,
        flexShrink: 0,
      }}>
        —
      </div>
    );
  }
  const color = score >= 70 ? "#059669" : score >= 40 ? "#d97706" : "#dc2626";
  const bg = score >= 70 ? "#d1fae5" : score >= 40 ? "#fef3c7" : "#fee2e2";
  return (
    <div style={{
      width: 48,
      height: 48,
      borderRadius: "50%",
      background: bg,
      border: `2.5px solid ${color}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 13,
      color,
      fontWeight: 800,
      flexShrink: 0,
    }}>
      {score}
    </div>
  );
}

export default function SollicitatiePage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const role = useMemo(() => getRole(), []);

  const [apps, setApps] = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { router.replace("/candidate/login"); return; }
    if (role && role !== "candidate") { router.replace("/employer"); return; }

    getMyApplications(token)
      .then(setApps)
      .catch((e) => {
        if (e?.message?.includes("401") || e?.message?.includes("403")) {
          clearSession();
          router.replace("/candidate/login");
        } else {
          setError(e?.message || "Kon sollicitaties niet laden");
        }
      })
      .finally(() => setLoading(false));
  }, [router, token, role]);

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
          {[
            { label: "Dashboard", href: "/candidate" },
            { label: "Sollicitaties", href: "/candidate/sollicitaties" },
            { label: "CV Beheer", href: "/candidate/cv" },
            { label: "Vacatures", href: "/vacatures" },
          ].map((item) => (
            <a key={item.href} href={item.href} style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 14, fontWeight: 500,
              color: item.href === "/candidate/sollicitaties" ? "#0A66C2" : "#374151",
              textDecoration: "none",
              background: item.href === "/candidate/sollicitaties" ? "#eff6ff" : "transparent",
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

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: 0 }}>Mijn sollicitaties</h1>
          <p style={{ color: "#6b7280", margin: "6px 0 0", fontSize: 15 }}>
            Overzicht van al je ingediende sollicitaties
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>Laden...</div>
        )}

        {error && (
          <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
            {error}
          </div>
        )}

        {!loading && apps.length === 0 && !error && (
          <div style={{
            background: "#fff",
            borderRadius: 16,
            padding: "60px 24px",
            textAlign: "center",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Nog geen sollicitaties
            </div>
            <div style={{ color: "#9ca3af", marginBottom: 24 }}>
              Solliciteer op vacatures om ze hier te zien verschijnen.
            </div>
            <a href="/vacatures" style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "#0A66C2",
              color: "#fff",
              borderRadius: 12,
              textDecoration: "none",
              fontWeight: 600,
            }}>
              Zoek vacatures
            </a>
          </div>
        )}

        {!loading && apps.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {apps.map((app) => (
              <a
                key={app.application_id}
                href={`/candidate/sollicitaties/${app.application_id}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#fff",
                  borderRadius: 16,
                  padding: "18px 22px",
                  textDecoration: "none",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  border: "1px solid #e5e7eb",
                  gap: 16,
                  transition: "box-shadow 0.15s",
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "center", flex: 1, minWidth: 0 }}>
                  <ScoreCircle score={app.match_score} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#111827", fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {app.vacancy_title}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
                      {app.vacancy_location || "Locatie onbekend"} · {new Date(app.created_at).toLocaleDateString("nl-NL")}
                    </div>
                    {app.ai_summary && (
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {app.ai_summary}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <StatusBadge status={app.status} />
                  <span style={{ color: "#9ca3af", fontSize: 18 }}>›</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
