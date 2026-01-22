"use client";

import { useEffect, useMemo, useState } from "react";
import {
  analyzeVacancy,
  listCandidateVacancies,
  login,
  me,
  uploadCV,
} from "@/lib/api";

type View = "home" | "login" | "dashboard";

export default function Page() {
  const [view, setView] = useState<View>("home");

  const [email, setEmail] = useState("candidate1@itspeanuts.ai");
  const [password, setPassword] = useState("Test123!123");

  const [token, setToken] = useState<string>("");
  const [meData, setMeData] = useState<any>(null);

  const [vacancies, setVacancies] = useState<any[]>([]);
  const [selectedVacancyId, setSelectedVacancyId] = useState<number>(1);

  const [cvFile, setCvFile] = useState<File | null>(null);

  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState<string>("");

  const [error, setError] = useState<string>("");

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) {
      setToken(t);
      setView("dashboard");
    }
  }, []);

  const canAnalyze = useMemo(() => !!token && !!selectedVacancyId, [token, selectedVacancyId]);

  async function doLogin() {
    setError("");
    setBusy("Inloggen...");
    try {
      const r = await login(email, password);
      localStorage.setItem("token", r.access_token);
      setToken(r.access_token);

      const m = await me(r.access_token);
      setMeData(m);

      setView("dashboard");
      await loadVacancies(r.access_token);
    } catch (e: any) {
      setError(e?.message || "Login error");
    } finally {
      setBusy("");
    }
  }

  async function loadVacancies(t = token) {
    setError("");
    setBusy("Vacatures laden...");
    try {
      const list = await listCandidateVacancies(t);
      setVacancies(list || []);
      if (list?.length) setSelectedVacancyId(list[0].id);
    } catch (e: any) {
      setError(e?.message || "Vacancies error");
    } finally {
      setBusy("");
    }
  }

  async function doUploadCV() {
    if (!cvFile) {
      setError("Kies eerst een CV bestand (PDF).");
      return;
    }
    setError("");
    setBusy("CV uploaden...");
    try {
      await uploadCV(token, cvFile);
    } catch (e: any) {
      setError(e?.message || "CV upload error");
    } finally {
      setBusy("");
    }
  }

  async function doAnalyze() {
    setError("");
    setBusy("Analyseren...");
    setResult(null);
    try {
      const r = await analyzeVacancy(token, Number(selectedVacancyId));
      setResult(r);
    } catch (e: any) {
      setError(e?.message || "Analyze error");
    } finally {
      setBusy("");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setToken("");
    setMeData(null);
    setVacancies([]);
    setResult(null);
    setView("home");
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>It’s Peanuts AI — Candidate</h1>

      {error ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #ffb4b4", background: "#fff5f5" }}>
          <b>Fout:</b> {error}
        </div>
      ) : null}

      {busy ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", background: "#fafafa" }}>
          {busy}
        </div>
      ) : null}

      {view === "home" && (
        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <button
            onClick={() => setView("login")}
            style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid #222", background: "#111", color: "#fff" }}
          >
            Candidate Login
          </button>
          <button
            onClick={() => setView("login")}
            style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid #222", background: "#fff", color: "#111" }}
          >
            Start (Demo)
          </button>
        </div>
      )}

      {view === "login" && (
        <div style={{ marginTop: 20, border: "1px solid #eee", borderRadius: 14, padding: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Inloggen</h2>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              />
            </label>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={doLogin}
                style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid #222", background: "#111", color: "#fff" }}
              >
                Login
              </button>
              <button
                onClick={() => setView("home")}
                style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}
              >
                Terug
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "dashboard" && (
        <div style={{ marginTop: 20, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700 }}>Ingelogd</div>
              <div style={{ opacity: 0.8, fontSize: 14 }}>
                {meData ? `${meData.email} (${meData.role})` : "…"}
              </div>
            </div>
            <button
              onClick={logout}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}
            >
              Logout
            </button>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>1) CV upload</h2>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              />
              <button
                onClick={doUploadCV}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #222", background: "#111", color: "#fff" }}
              >
                Upload CV
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
              Tip: Kies je PDF en klik Upload.
            </div>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>2) Vacature kiezen & analyze</h2>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
              <button
                onClick={() => loadVacancies()}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}
              >
                Vacatures laden
              </button>

              <select
                value={selectedVacancyId}
                onChange={(e) => setSelectedVacancyId(Number(e.target.value))}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc", minWidth: 260 }}
              >
                {(vacancies.length ? vacancies : [{ id: 1, title: "Vacancy #1 (fallback)" }]).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.id} — {v.title || "Vacature"}
                  </option>
                ))}
              </select>

              <button
                disabled={!canAnalyze}
                onClick={doAnalyze}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #222",
                  background: canAnalyze ? "#111" : "#888",
                  color: "#fff",
                  cursor: canAnalyze ? "pointer" : "not-allowed",
                }}
              >
                Analyze
              </button>
            </div>

            {result && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid #ddd", background: "#fafafa" }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Match score: {result.match_score}</div>
                <div style={{ marginTop: 10 }}>
                  <b>Summary</b>
                  <div>{result.summary}</div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <b>Strengths</b>
                  <div>{result.strengths}</div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <b>Gaps</b>
                  <div>{result.gaps}</div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <b>Suggested questions</b>
                  <div>{result.suggested_questions}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

