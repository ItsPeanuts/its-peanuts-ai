"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createVacancy, employerVacancies, me } from "@/lib/api";
import { clearSession, getRole, getToken } from "@/lib/session";

type Vacancy = {
  id: number;
  title: string;
  location?: string | null;
  hours_per_week?: string | null;
  salary_range?: string | null;
  description?: string | null;
};

export default function EmployerPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const role = useMemo(() => getRole(), []);

  const [userEmail, setUserEmail] = useState("");
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const [title, setTitle] = useState("Sales Manager");
  const [location, setLocation] = useState("Rotterdam");
  const [hours, setHours] = useState("40");
  const [salary, setSalary] = useState("€3.500 - €4.500");
  const [desc, setDesc] = useState("Leidinggeven aan sales teams, new business, strategie");

  useEffect(() => {
    if (!token) {
      router.push("/");
      return;
    }
    if (role && role !== "employer") {
      router.push("/candidate");
      return;
    }
    (async () => {
      try {
        const u = await me(token);
        setUserEmail(u.email || "");
      } catch {
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
      const list = await employerVacancies(token);
      setVacancies(list || []);
      setMsg(`Vacatures geladen: ${list?.length ?? 0}`);
    } catch (e: any) {
      setErr(e?.message || "Vacancies load failed");
    } finally {
      setLoading(false);
    }
  }

  async function doCreateVacancy() {
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const created = await createVacancy(token, {
        title,
        location,
        hours_per_week: hours,
        salary_range: salary,
        description: desc,
      });
      setMsg(`Vacature aangemaakt (id=${created?.id})`);
      await refreshVacancies();
    } catch (e: any) {
      setErr(e?.message || "Create vacancy failed");
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
          <h1 style={{ margin: 0, fontSize: 24 }}>Employer dashboard</h1>
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
        <h2 style={{ marginTop: 0 }}>1) Vacature aanmaken</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, opacity: 0.7 }}>Titel</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, opacity: 0.7 }}>Locatie</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, opacity: 0.7 }}>Uren per week</label>
            <input value={hours} onChange={(e) => setHours(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, opacity: 0.7 }}>Salaris range</label>
            <input value={salary} onChange={(e) => setSalary(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: 12, opacity: 0.7 }}>Omschrijving</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button
            onClick={doCreateVacancy}
            disabled={loading}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff" }}
          >
            Vacature aanmaken
          </button>
        </div>
      </section>

      <section style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>2) Jouw vacatures</h2>

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
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
