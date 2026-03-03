"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  me, getCandidateCVs, uploadCV, getMyApplications,
  CandidateCVOut, ApplicationWithDetails,
} from "@/lib/api";
import { clearSession, getToken, getRole } from "@/lib/session";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  applied:     { label: "In behandeling", color: "#6b7280", bg: "#f3f4f6" },
  shortlisted: { label: "Geselecteerd",   color: "#1d4ed8", bg: "#dbeafe" },
  interview:   { label: "Interview",      color: "#d97706", bg: "#fef3c7" },
  hired:       { label: "Aangenomen",     color: "#059669", bg: "#d1fae5" },
  rejected:    { label: "Afgewezen",      color: "#dc2626", bg: "#fee2e2" },
};

const NAV = [
  { label: "Dashboard",     href: "/candidate" },
  { label: "Sollicitaties", href: "/candidate/sollicitaties" },
  { label: "CV Beheer",     href: "/candidate/cv" },
  { label: "Profiel",       href: "/candidate/profiel" },
  { label: "Vacatures",     href: "/vacatures" },
];

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default function ProfielPage() {
  const router  = useRouter();
  const token   = useMemo(() => getToken(), []);
  const role    = useMemo(() => getRole(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const [user, setUser]             = useState<{ full_name: string; email: string } | null>(null);
  const [cvs, setCvs]               = useState<CandidateCVOut[]>([]);
  const [applications, setApps]     = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [uploadMsg, setUploadMsg]   = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [cvExpanded, setCvExpanded] = useState(false);

  useEffect(() => {
    if (!token) { router.replace("/candidate/login"); return; }
    if (role && role !== "candidate") { router.replace("/employer"); return; }
    (async () => {
      try {
        const [u, cvList, apps] = await Promise.all([
          me(token),
          getCandidateCVs(token),
          getMyApplications(token),
        ]);
        setUser(u);
        setCvs(cvList);
        setApps(apps);
      } catch {
        clearSession();
        router.replace("/candidate/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, token, role]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      await uploadCV(token, file);
      const updated = await getCandidateCVs(token);
      setCvs(updated);
      setUploadMsg({ type: "ok", text: `'${file.name}' succesvol geüpload.` });
    } catch (err: unknown) {
      setUploadMsg({ type: "err", text: (err as Error)?.message || "Upload mislukt" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>Laden...</div>
      </div>
    );
  }

  const latestCv   = cvs[0] ?? null;
  const recentApps = applications.slice(0, 5);
  const initials   = user ? getInitials(user.full_name || user.email) : "?";

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Sub-nav */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px", height: 48, display: "flex", alignItems: "center", gap: 4 }}>
          {NAV.map((item) => {
            const active = item.href === "/candidate/profiel";
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  color: active ? "#0f766e" : "#6b7280",
                  background: active ? "#f0fdfa" : "transparent",
                  textDecoration: "none",
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = "#0f766e"; (e.currentTarget as HTMLElement).style.background = "#f0fdfa"; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = "#6b7280"; (e.currentTarget as HTMLElement).style.background = "transparent"; } }}
              >
                {item.label}
              </Link>
            );
          })}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>{user?.email}</span>
            <button
              onClick={() => { clearSession(); router.push("/"); }}
              style={{ fontSize: 13, fontWeight: 500, color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}
            >
              Uitloggen
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>

        {/* Profiel header */}
        <div style={{
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16,
          padding: "28px 32px", marginBottom: 24,
          display: "flex", alignItems: "center", gap: 24,
        }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%", background: "#0f766e",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
              {user?.full_name || "Kandidaat"}
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>{user?.email}</p>
          </div>
          <div style={{ display: "flex", gap: 24, textAlign: "center" }}>
            {[
              { label: "Sollicitaties", value: applications.length },
              { label: "CV's",          value: cvs.length },
              { label: "Interviews",    value: applications.filter(a => a.status === "interview").length },
            ].map((stat) => (
              <div key={stat.label}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#0f766e" }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* CV kaart */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Mijn CV</h2>
              {cvs.length > 1 && (
                <Link href="/candidate/cv" style={{ fontSize: 12, color: "#0f766e", textDecoration: "none" }}>
                  Alle {cvs.length} CV's
                </Link>
              )}
            </div>

            {/* Meest recente CV */}
            {latestCv ? (
              <div style={{ background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb", padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "#111827", fontSize: 13, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {latestCv.source_filename || "Naamloos bestand"}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>
                      Geüpload {new Date(latestCv.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: "#059669", background: "#d1fae5", padding: "2px 8px", borderRadius: 20 }}>
                    Actief
                  </span>
                </div>

                {latestCv.text_preview && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{
                      fontSize: 12, color: "#6b7280", lineHeight: 1.6,
                      overflow: cvExpanded ? "visible" : "hidden",
                      display: cvExpanded ? "block" : "-webkit-box",
                      WebkitLineClamp: cvExpanded ? undefined : 3,
                      WebkitBoxOrient: "vertical",
                    } as React.CSSProperties}>
                      {latestCv.text_preview}
                    </div>
                    {latestCv.text_preview.length > 180 && (
                      <button
                        onClick={() => setCvExpanded(p => !p)}
                        style={{ fontSize: 11, color: "#0f766e", background: "none", border: "none", cursor: "pointer", padding: "4px 0 0", fontWeight: 500 }}
                      >
                        {cvExpanded ? "Minder tonen" : "Meer tonen"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#9ca3af", fontSize: 13 }}>
                Nog geen CV geüpload
              </div>
            )}

            {/* Upload knop */}
            <div>
              {uploadMsg && (
                <div style={{
                  fontSize: 12, borderRadius: 8, padding: "8px 12px", marginBottom: 10,
                  color: uploadMsg.type === "ok" ? "#059669" : "#dc2626",
                  background: uploadMsg.type === "ok" ? "#d1fae5" : "#fee2e2",
                }}>
                  {uploadMsg.text}
                </div>
              )}
              <input ref={fileRef} type="file" accept=".pdf,.docx" onChange={handleUpload} style={{ display: "none" }} id="profiel-cv-upload" />
              <label
                htmlFor="profiel-cv-upload"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  cursor: uploading ? "not-allowed" : "pointer",
                  background: uploading ? "#e5e7eb" : "#0f766e",
                  color: uploading ? "#9ca3af" : "#fff",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                {uploading ? "Uploaden..." : latestCv ? "Nieuw CV uploaden" : "CV uploaden"}
              </label>
            </div>
          </div>

          {/* Recente sollicitaties */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Recente sollicitaties</h2>
              {applications.length > 5 && (
                <Link href="/candidate/sollicitaties" style={{ fontSize: 12, color: "#0f766e", textDecoration: "none" }}>
                  Alle {applications.length}
                </Link>
              )}
            </div>

            {recentApps.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#9ca3af", fontSize: 13 }}>
                Nog geen sollicitaties
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recentApps.map((app) => {
                  const s = STATUS_LABELS[app.status] ?? { label: app.status, color: "#374151", bg: "#f3f4f6" };
                  return (
                    <div key={app.application_id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 12px", background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb", gap: 8,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "#111827", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {app.vacancy_title}
                        </div>
                        {app.vacancy_location && (
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{app.vacancy_location}</div>
                        )}
                      </div>
                      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, color: s.color, background: s.bg }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <Link
              href="/candidate/sollicitaties"
              style={{
                display: "block", textAlign: "center", padding: "9px", borderRadius: 10,
                border: "1px solid #e5e7eb", fontSize: 13, fontWeight: 500, color: "#374151",
                textDecoration: "none",
              }}
            >
              Alle sollicitaties bekijken
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
