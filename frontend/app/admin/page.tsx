"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { me } from "@/lib/api";
import { clearSession, getToken, getRole } from "@/lib/session";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://its-peanuts-backend.onrender.com";

type AdminStats = {
  total_users: number;
  total_candidates: number;
  total_employers: number;
  total_vacancies: number;
  total_applications: number;
  total_interviews: number;
  avg_match_score: number | null;
};

type AdminUser = {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  plan: string | null;
};

type AdminVacancy = {
  id: number;
  title: string;
  location: string | null;
  employer_id: number;
  employer_email: string;
  application_count: number;
};

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  admin:     { color: "#7c3aed", bg: "#f5f3ff" },
  employer:  { color: "#0f766e", bg: "#f0fdfa" },
  candidate: { color: "#1d4ed8", bg: "#dbeafe" },
};

async function apiFetch(token: string, path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      accept: "application/json",
      ...(opts?.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || "API fout");
  return data;
}

export default function AdminPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const role = useMemo(() => getRole(), []);

  const [view, setView] = useState<"stats" | "users" | "vacancies">("stats");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [vacancies, setVacancies] = useState<AdminVacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!token) { router.replace("/candidate/login"); return; }
    if (role && role !== "admin") { router.replace("/"); return; }

    (async () => {
      try {
        await me(token); // verificeer token
        const [s, u, v] = await Promise.all([
          apiFetch(token, "/admin/stats"),
          apiFetch(token, "/admin/users"),
          apiFetch(token, "/admin/vacancies"),
        ]);
        setStats(s);
        setUsers(u);
        setVacancies(v);
      } catch {
        clearSession();
        router.replace("/candidate/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, token, role]);

  async function handlePatchRole(userId: number, newRole: string) {
    if (!token) return;
    try {
      const updated = await apiFetch(token, `/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setMsg("Rol bijgewerkt");
      setTimeout(() => setMsg(""), 3000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Bijwerken mislukt");
    }
  }

  async function handleDeleteUser(userId: number, email: string) {
    if (!token || !confirm(`Weet je zeker dat je ${email} wilt verwijderen?`)) return;
    try {
      await apiFetch(token, `/admin/users/${userId}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setMsg("Gebruiker verwijderd");
      setTimeout(() => setMsg(""), 3000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Verwijderen mislukt");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Admin laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col min-h-screen flex-shrink-0">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: "#7c3aed" }}>A</div>
            <span className="font-bold text-gray-900 text-sm">Admin Panel</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">It&apos;s Peanuts AI</div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {([
            { id: "stats",     label: "Dashboard" },
            { id: "users",     label: "Gebruikers" },
            { id: "vacancies", label: "Vacatures" },
          ] as const).map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                view === item.id ? "text-purple-700 bg-purple-50" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-1">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 pt-1 pb-0.5">Testen als</div>
          <button
            onClick={() => router.push("/employer")}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Werkgever →
          </button>
          <button
            onClick={() => router.push("/candidate")}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Kandidaat →
          </button>
          <button
            onClick={() => { clearSession(); router.push("/"); }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors mt-1"
          >
            Uitloggen
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">
        {msg && <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm mb-5">{msg}</div>}
        {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mb-5">{err}</div>}

        {/* === DASHBOARD STATS === */}
        {view === "stats" && stats && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform overzicht</h1>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: "Gebruikers",     value: stats.total_users,        color: "#7c3aed" },
                { label: "Kandidaten",     value: stats.total_candidates,   color: "#1d4ed8" },
                { label: "Werkgevers",     value: stats.total_employers,    color: "#0f766e" },
                { label: "Vacatures",      value: stats.total_vacancies,    color: "#d97706" },
                { label: "Sollicitaties",  value: stats.total_applications, color: "#059669" },
                { label: "Interviews",     value: stats.total_interviews,   color: "#0891b2" },
                { label: "Gem. matchscore", value: stats.avg_match_score !== null ? `${stats.avg_match_score}%` : "—", color: "#dc2626" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{s.label}</div>
                  <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-sm font-bold text-gray-700 mb-3">Recente gebruikers</h2>
              <div className="space-y-2">
                {users.slice(0, 8).map((u) => {
                  const rc = ROLE_COLORS[u.role] ?? { color: "#374151", bg: "#f3f4f6" };
                  return (
                    <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{u.full_name || u.email}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: rc.color, background: rc.bg }}>
                        {u.role}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* === GEBRUIKERS === */}
        {view === "users" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Gebruikers <span className="text-gray-400 text-lg font-normal">({users.length})</span></h1>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Naam</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const rc = ROLE_COLORS[u.role] ?? { color: "#374151", bg: "#f3f4f6" };
                    return (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-800">{u.full_name || "—"}</td>
                        <td className="px-5 py-3 text-gray-500">{u.email}</td>
                        <td className="px-5 py-3">
                          <select
                            value={u.role}
                            onChange={(e) => handlePatchRole(u.id, e.target.value)}
                            className="text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-300"
                            style={{ color: rc.color, background: rc.bg }}
                          >
                            <option value="candidate">candidate</option>
                            <option value="employer">employer</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="px-5 py-3 text-gray-400 text-xs">{u.plan || "—"}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          >
                            Verwijder
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* === VACATURES === */}
        {view === "vacancies" && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Alle vacatures <span className="text-gray-400 text-lg font-normal">({vacancies.length})</span>
            </h1>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vacature</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Locatie</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Werkgever</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sollicitaties</th>
                  </tr>
                </thead>
                <tbody>
                  {vacancies.map((v) => (
                    <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{v.title}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{v.location || "—"}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{v.employer_email}</td>
                      <td className="px-5 py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "#f0fdfa", color: "#0f766e" }}>
                          {v.application_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
