"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCandidateCVs, uploadCV, CandidateCVOut } from "@/lib/api";
import { clearSession, getToken, getRole } from "@/lib/session";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/candidate" },
  { label: "Sollicitaties", href: "/candidate/sollicitaties" },
  { label: "CV Beheer", href: "/candidate/cv" },
  { label: "Vacatures", href: "/vacatures" },
];

export default function CVBeheerPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const role = useMemo(() => getRole(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const [cvs, setCvs] = useState<CandidateCVOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) { router.replace("/candidate/login"); return; }
    if (role && role !== "candidate") { router.replace("/employer"); return; }

    getCandidateCVs(token)
      .then(setCvs)
      .catch((e) => {
        if (e?.message?.includes("401") || e?.message?.includes("403")) {
          clearSession();
          router.replace("/candidate/login");
        } else {
          setError(e?.message || "Kon CV's niet laden");
        }
      })
      .finally(() => setLoading(false));
  }, [router, token, role]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      await uploadCV(token, file);
      const updated = await getCandidateCVs(token);
      setCvs(updated);
      setSuccess(`'${file.name}' is succesvol geüpload en verwerkt.`);
    } catch (e: unknown) {
      setError((e as Error)?.message || "Upload mislukt");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

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
              color: item.href === "/candidate/cv" ? "#0A66C2" : "#374151",
              textDecoration: "none",
              background: item.href === "/candidate/cv" ? "#eff6ff" : "transparent",
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
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: 0 }}>CV Beheer</h1>
          <p style={{ color: "#6b7280", margin: "6px 0 0", fontSize: 15 }}>
            Upload je CV zodat onze AI je kan matchen met vacatures.
          </p>
        </div>

        {/* Upload kaart */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "28px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Nieuw CV uploaden</h2>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 18px" }}>
            Ondersteunde bestandstypen: <strong>.pdf</strong> en <strong>.docx</strong>
          </p>

          {error && (
            <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: "#d1fae5", color: "#059669", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 14 }}>
              {success}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleUpload}
            disabled={uploading}
            style={{ display: "none" }}
            id="cv-upload"
          />
          <label
            htmlFor="cv-upload"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: uploading ? "#e5e7eb" : "linear-gradient(135deg, #0A66C2, #0952a0)",
              color: uploading ? "#9ca3af" : "#fff",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              cursor: uploading ? "not-allowed" : "pointer",
              boxShadow: uploading ? "none" : "0 2px 10px rgba(10,102,194,0.25)",
            }}
          >
            {uploading ? "Bezig met uploaden..." : "CV selecteren en uploaden"}
          </label>
        </div>

        {/* CV lijst */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: "0 0 18px" }}>Geüploade CV's</h2>

          {loading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>Laden...</div>
          )}

          {!loading && cvs.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "#374151" }}>Nog geen CV's geüpload</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Upload je eerste CV om aan de slag te gaan.</div>
            </div>
          )}

          {!loading && cvs.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {cvs.map((cv) => (
                <div key={cv.id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "16px 18px",
                  background: "#f8fafc",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  gap: 16,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "#111827", fontSize: 14, marginBottom: 4 }}>
                      {cv.source_filename || "Naamloos bestand"}
                    </div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: cv.text_preview ? 8 : 0 }}>
                      Geüpload op {new Date(cv.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                    {cv.text_preview && (
                      <div style={{
                        fontSize: 12,
                        color: "#6b7280",
                        background: "#fff",
                        borderRadius: 8,
                        padding: "8px 12px",
                        border: "1px solid #e5e7eb",
                        lineHeight: 1.5,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      } as React.CSSProperties}>
                        {cv.text_preview}
                      </div>
                    )}
                  </div>
                  <div style={{
                    flexShrink: 0,
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#059669",
                    background: "#d1fae5",
                  }}>
                    Verwerkt
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
