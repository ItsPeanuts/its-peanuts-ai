"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { listCandidateVacancies as candidateVacancies, uploadCV as uploadCv, analyzeVacancy, me } from "@/lib/api";
import { clearSession, getRole, getToken } from "@/lib/session";

type Vacancy = {
  id: number;
  title: string;
  location?: string | null;
  hours_per_week?: string | null;
  salary_range?: string | null;
  description?: string | null;
};

export default function CandidatePage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const role = useMemo(() => getRole(), []);

  const [userEmail, setUserEmail] = useState("");
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const [file, setFile] = useState<File | null>(null);
  const [analyzeId, setAnalyzeId] = useState<number>(1);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      router.push("/");
      return;
    }
    if (role && role !== "candidate") {
      router.push("/employer");
      return;
    }
    (async () => {
      try {
        const u = await me(token);
        setUserEmail(u.email || "");
      } catch {
        // token kapot
        clearSession();
        router.push("/");
      }
    })();
  }, [router, role, token]);

  async function refreshVacancies() {
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const list = await candidateVacancies(token);
      setVacancies(list || []);
      setMsg(`Vacatures geladen: ${list?.length ?? 0}`);
    } catch (e: any) {
      setErr(e?.message || "Vacancies load failed");
    } finally {
      setLoading(false);
    }
  }

  async function doUploadCv() {
    setErr("");
    setMsg("");
    if (!file) {
      setErr("Kies eerst een PDF bestand.");
      return;
    }
    setLoading(true);
    try {
      const text = await uploadCv(token, file);
      setMsg(`CV geüpload. Extracted text length: ${String(text || "").length}`);
    } catch (e: any) {
      setErr(e?.message || "CV upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function doAnalyze() {
    setErr("");
    setMsg("");
    setAnalysis(null);
    setLoading(true);
    try {
      const res = await analyzeVacancy(token, analyzeId);
      setAnalysis(res);
      setMsg(`Analyze OK (vacancy_id=${analyzeId})`);
    } catch (e: any) {
      setErr(e?.message || "Analyze failed");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearSession();
    router.push("/");
  }

  return (
    <main style={{ maxWidth: 980, margin: "30px auto", padding: 16, fontFamily: "system-ui, -apple-system" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Candidate dashboard</h1>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{userEmail}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={refreshVacancies} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #333" }}>
            Refresh vacatures
          </button>
          <button onClick={logout} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #333" }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {loading ? <div style={{ opacity: 0.7 }}>Bezig...</div> : null}
        {msg ? <div style={{ marginTop: 8, color: "#0a7a2f" }}>{msg}</div> : null}
        {err ? <div style={{ marginTop: 8, color: "crimson" }}>{err}</div> : null}
      </div>

      <section style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>1) CV upload</h2>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <div style={{ marginTop: 10 }}>
          <button
            onClick={doUploadCv}
            disabled={loading}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff" }}
          >
            Upload CV
          </button>
        </div>
      </section>

      <section style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>2) Vacatures</h2>

        {vacancies.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nog geen vacatures geladen. Klik “Refresh vacatures”.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            {vacancies.map((v) => (
              <div key={v.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <strong>{v.title}</strong>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>id: {v.id}</span>
                </div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                  {v.location ? `${v.location} · ` : ""}{v.hours_per_week ? `${v.hours_per_week}u · ` : ""}{v.salary_range || ""}
                </div>
                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>{v.description}</div>
                <div style={{ marginTop: 10 }}>
                  <button
                    onClick={() => setAnalyzeId(v.id)}
                    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #333" }}
                  >
                    Selecteer voor analyze
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>3) Analyze</h2>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 13, opacity: 0.8 }}>Vacancy ID:</label>
          <input
            value={analyzeId}
            onChange={(e) => setAnalyzeId(Number(e.target.value || 0))}
            style={{ width: 120, padding: 8, borderRadius: 10, border: "1px solid #ccc" }}
          />
          <button
            onClick={doAnalyze}
            disabled={loading}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff" }}
          >
            Run analyze
          </button>
        </div>

        {analysis ? (
          <pre style={{ marginTop: 12, background: "#0b0b0b", color: "#eaeaea", padding: 12, borderRadius: 12, overflowX: "auto" }}>
{JSON.stringify(analysis, null, 2)}
          </pre>
        ) : null}
      </section>
    </main>
  );
}
