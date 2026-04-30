"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { me } from "@/lib/api";
import { clearSession, getToken, getRole } from "@/lib/session";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://its-peanuts-backend.onrender.com";

// ── Types ──────────────────────────────────────────────────────────────────────

type AdminStats = {
  total_users: number; total_candidates: number; total_employers: number;
  total_vacancies: number; total_applications: number; total_interviews: number;
  avg_match_score: number | null;
};
type AdminUser = { id: number; email: string; full_name: string | null; role: string; plan: string | null; trial_ends_at: string | null; };
type AdminVacancy = { id: number; title: string; location: string | null; employer_id: number; employer_email: string; application_count: number; };

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  admin:     { color: "#7c3aed", bg: "#f5f3ff" },
  employer:  { color: "#7C3AED", bg: "#f0fdfa" },
  candidate: { color: "#1d4ed8", bg: "#dbeafe" },
};

// ── API helper ─────────────────────────────────────────────────────────────────

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
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || "API fout");
  return data;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [token] = useState<string | null>(() => getToken());
  const [role] = useState<string | null>(() => getRole());

  const [view, setView] = useState<"stats" | "users" | "vacancies" | "promotions" | "analytics">("stats");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [vacancies, setVacancies] = useState<AdminVacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");

  // Maintenance state
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("We zijn de website en AI aan het verbeteren. We zijn zo weer volledig online!");
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);

  // Analytics state
  type DailyVisitor = { date: string; visitors: number };
  type MonthlyPayment = { month: string; count: number; revenue: number; plans: Record<string, number> };
  type RecentPayment = { id: number; invoice_number: string | null; user_email: string | null; plan: string | null; interval: string | null; amount_total: number | null; payment_type: string | null; created_at: string };
  type MonthlySignup = { month: string; candidates: number; employers: number };

  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [visitors, setVisitors] = useState<DailyVisitor[]>([]);
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeSubscriptions, setActiveSubscriptions] = useState(0);
  const [monthlySignups, setMonthlySignups] = useState<MonthlySignup[]>([]);

  // Users tab + zoek
  const [userTab, setUserTab] = useState<"employers" | "candidates">("employers");
  const [employerSearch, setEmployerSearch] = useState("");

  // Promotions state
  type AdminPromotion = {
    id: number; vacancy_id: number; vacancy_title: string | null;
    employer_email: string | null; duration_days: number; total_price: number;
    status: string; created_at: string | null; paid_at: string | null;
    starts_at: string | null; ends_at: string | null;
  };
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(false);

  // ── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) { router.replace("/candidate/login"); return; }
    if (role && role !== "admin") { router.replace("/"); return; }
    (async () => {
      try {
        await me(token);
        const [s, u, v] = await Promise.all([
          apiFetch(token, "/admin/stats"),
          apiFetch(token, "/admin/users"),
          apiFetch(token, "/admin/vacancies"),
        ]);
        setStats(s); setUsers(u); setVacancies(v);
      } catch {
        clearSession(); router.replace("/candidate/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, token, role]);

  useEffect(() => {
    if (view === "promotions" && token) loadPromotions();
    if (view === "analytics" && token) loadAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, token]);

  // ── Utilities ──────────────────────────────────────────────────────────────

  const copyText = useCallback((text: string, label = "") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label || text.slice(0, 20));
      setMsg("✓ Gekopieerd naar klembord");
      setTimeout(() => { setMsg(""); setCopied(""); }, 2500);
    });
  }, []);

  const showErr = (e: unknown) => {
    setErr(e instanceof Error ? e.message : "Fout opgetreden");
    setTimeout(() => setErr(""), 5000);
  };

  // ── Users/Vacancies handlers ───────────────────────────────────────────────

  async function handlePatchRole(userId: number, newRole: string) {
    if (!token) return;
    try {
      const updated = await apiFetch(token, `/admin/users/${userId}`, {
        method: "PATCH", body: JSON.stringify({ role: newRole }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setMsg("Rol bijgewerkt"); setTimeout(() => setMsg(""), 3000);
    } catch (e) { showErr(e); }
  }

  async function handlePatchPlan(userId: number, newPlan: string) {
    if (!token) return;
    try {
      const updated = await apiFetch(token, `/admin/users/${userId}`, {
        method: "PATCH", body: JSON.stringify({ plan: newPlan }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setMsg("Plan bijgewerkt"); setTimeout(() => setMsg(""), 3000);
    } catch (e) { showErr(e); }
  }

  async function handleGiveFreeTrial(userId: number, email: string) {
    if (!token || !confirm(`Geef ${email} 1 maand gratis trial?`)) return;
    try {
      const updated = await apiFetch(token, `/admin/users/${userId}/free-trial`, { method: "POST" });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setMsg(`Gratis trial gegeven aan ${email}`); setTimeout(() => setMsg(""), 4000);
    } catch (e) { showErr(e); }
  }

  async function handleRevokeFreeTrial(userId: number, email: string) {
    if (!token || !confirm(`Trek de gratis trial in van ${email}?`)) return;
    try {
      const updated = await apiFetch(token, `/admin/users/${userId}/free-trial`, { method: "DELETE" });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setMsg(`Trial ingetrokken van ${email}`); setTimeout(() => setMsg(""), 4000);
    } catch (e) { showErr(e); }
  }

  async function handleDeleteUser(userId: number, email: string) {
    if (!token || !confirm(`Weet je zeker dat je ${email} wilt verwijderen?`)) return;
    try {
      await apiFetch(token, `/admin/users/${userId}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setMsg("Gebruiker verwijderd"); setTimeout(() => setMsg(""), 3000);
    } catch (e) { showErr(e); }
  }

  async function handleResetPassword(userId: number, email: string) {
    const newPw = prompt(`Nieuw wachtwoord instellen voor ${email}:`);
    if (!newPw || !token) return;
    if (newPw.length < 8) { showErr("Wachtwoord moet minimaal 8 tekens zijn"); return; }
    try {
      await apiFetch(token, `/admin/users/${userId}/password`, {
        method: "PATCH", body: JSON.stringify({ new_password: newPw }),
      });
      setMsg(`Wachtwoord van ${email} gewijzigd`); setTimeout(() => setMsg(""), 4000);
    } catch (e) { showErr(e); }
  }

  // ── Maintenance handlers ───────────────────────────────────────────────────

  async function handleToggleMaintenance(enabled: boolean) {
    if (!token) return;
    setMaintenanceSaving(true);
    try {
      const result = await apiFetch(token, "/admin/maintenance", {
        method: "POST",
        body: JSON.stringify({ enabled, message: maintenanceMsg }),
      });
      setMaintenance(result.enabled);
      setMsg(enabled ? "Onderhoudsmelding ingeschakeld" : "Onderhoudsmelding uitgeschakeld");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) { showErr(e); }
    finally { setMaintenanceSaving(false); }
  }

  // ── Promotions handlers ────────────────────────────────────────────────────

  async function loadAnalytics() {
    if (!token) return;
    setAnalyticsLoading(true);
    try {
      const [vis, pay, sig] = await Promise.all([
        apiFetch(token, "/admin/analytics/visitors?days=30"),
        apiFetch(token, "/admin/analytics/payments"),
        apiFetch(token, "/admin/analytics/signups"),
      ]);
      setVisitors(vis);
      setMonthlyPayments(pay.monthly || []);
      setRecentPayments(pay.recent || []);
      setTotalRevenue(pay.total_revenue || 0);
      setActiveSubscriptions(pay.active_subscriptions || 0);
      setMonthlySignups(sig);
    } catch (e) { showErr(e); }
    finally { setAnalyticsLoading(false); }
  }

  async function loadPromotions() {
    if (!token) return;
    setPromotionsLoading(true);
    try {
      const data = await apiFetch(token, "/admin/promotions");
      setPromotions(data);
    } catch (e) { showErr(e); }
    finally { setPromotionsLoading(false); }
  }

  async function handleActivatePromotion(id: number) {
    if (!token) return;
    try {
      const updated = await apiFetch(token, `/promotions/${id}/activate`, { method: "POST" });
      setPromotions((prev) => prev.map((p) => p.id === id ? { ...p, ...updated } : p));
      setMsg("Promotie geactiveerd!"); setTimeout(() => setMsg(""), 3000);
    } catch (e) { showErr(e); }
  }

  async function handleCompletePromotion(id: number) {
    if (!token) return;
    try {
      await apiFetch(token, `/promotions/${id}/complete`, { method: "POST" });
      setPromotions((prev) => prev.map((p) => p.id === id ? { ...p, status: "completed" } : p));
      setMsg("Promotie afgerond!"); setTimeout(() => setMsg(""), 3000);
    } catch (e) { showErr(e); }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Admin laden...</div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 md:flex overflow-x-hidden w-full">

      {/* Mobiel overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-200 flex-col min-h-screen flex-shrink-0 ${sidebarOpen ? "fixed flex" : "hidden md:flex md:static"}`}>
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: "#7c3aed" }}>A</div>
            <span className="font-bold text-gray-900 text-sm">Admin Panel</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">VorzaIQ</div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {([
            { id: "stats",      label: "Dashboard",   icon: "📊" },
            { id: "analytics",  label: "Analytics",   icon: "📈" },
            { id: "users",      label: "Gebruikers",  icon: "👥" },
            { id: "vacancies",  label: "Vacatures",   icon: "📋" },
            { id: "promotions", label: "Promoties",   icon: "📢" },
          ] as const).map((item) => (
            <button
              key={item.id}
              onClick={() => { setErr(""); setMsg(""); setView(item.id); setSidebarOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                view === item.id ? "text-purple-700 bg-purple-50" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-base">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-1">
          <button onClick={() => router.push("/admin/organisaties")} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">🏢 Organisaties</button>
        </div>

        <div className="p-3 border-t border-gray-100 space-y-1">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 pt-1 pb-0.5">Testen als</div>
          <button onClick={() => router.push("/employer")} className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Werkgever →</button>
          <button onClick={() => router.push("/candidate")} className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Kandidaat →</button>
          <button onClick={() => { clearSession(); router.push("/"); }} className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors mt-1">Uitloggen</button>
        </div>
      </aside>

      {/* Main */}
      <main className="w-full md:flex-1 p-4 md:p-8 overflow-x-hidden overflow-y-auto min-w-0">
        {/* Mobiele topbar met hamburger */}
        <div className="flex items-center gap-3 mb-5 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600"
            aria-label="Menu openen"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-gray-900 text-sm">Admin Panel</span>
        </div>

        {msg && <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm mb-5">{msg}</div>}
        {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mb-5 cursor-pointer" onClick={() => setErr("")}>{err} ✕</div>}

        {/* ─── DASHBOARD ─── */}
        {view === "stats" && stats && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform overzicht</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Gebruikers",      value: stats.total_users,        color: "#7c3aed" },
                { label: "Kandidaten",      value: stats.total_candidates,   color: "#1d4ed8" },
                { label: "Werkgevers",      value: stats.total_employers,    color: "#7C3AED" },
                { label: "Vacatures",       value: stats.total_vacancies,    color: "#d97706" },
                { label: "Sollicitaties",   value: stats.total_applications, color: "#059669" },
                { label: "Interviews",      value: stats.total_interviews,   color: "#0891b2" },
                { label: "Gem. matchscore", value: stats.avg_match_score !== null ? `${stats.avg_match_score}%` : "—", color: "#dc2626" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 md:p-5">
                  <div className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-tight md:tracking-wide mb-1 md:mb-2 truncate">{s.label}</div>
                  <div className="text-xl md:text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-sm font-bold text-gray-700 mb-3 mt-6">Onderhoudsmelding</h2>
              <div className={`rounded-xl border p-4 mb-4 ${maintenance ? "border-purple-200 bg-purple-50" : "border-gray-100 bg-white"}`}>
                <div className="flex items-center justify-between gap-4 mb-3">
                  <span className="text-sm font-semibold text-gray-800">
                    {maintenance ? "🔧 Melding actief" : "✅ Website online"}
                  </span>
                  <button
                    onClick={() => handleToggleMaintenance(!maintenance)}
                    disabled={maintenanceSaving}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition disabled:opacity-60 ${
                      maintenance
                        ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        : "text-white"
                    }`}
                    style={!maintenance ? { background: "#7C3AED" } : {}}
                  >
                    {maintenanceSaving ? "..." : maintenance ? "Uitschakelen" : "Inschakelen"}
                  </button>
                </div>
                <textarea
                  value={maintenanceMsg}
                  onChange={(e) => setMaintenanceMsg(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-purple-400 resize-none"
                  placeholder="Tekst voor de melding..."
                />
              </div>

              <h2 className="text-sm font-bold text-gray-700 mb-3">Recente gebruikers</h2>
              <div className="space-y-2">
                {users.slice(0, 8).map((u) => {
                  const rc = ROLE_COLORS[u.role] ?? { color: "#374151", bg: "#f3f4f6" };
                  return (
                    <div key={u.id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{u.full_name || u.email}</div>
                        <div className="text-xs text-gray-400 truncate">{u.email}</div>
                      </div>
                      <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: rc.color, background: rc.bg }}>{u.role}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ─── GEBRUIKERS ─── */}
        {view === "users" && (() => {
          const employers  = users.filter((u) => u.role === "employer" || u.role === "admin");
          const candidates = users.filter((u) => u.role === "candidate");
          const filteredEmployers = employers.filter((u) =>
            employerSearch === "" ||
            u.email.toLowerCase().includes(employerSearch.toLowerCase()) ||
            (u.full_name ?? "").toLowerCase().includes(employerSearch.toLowerCase())
          );
          const list = userTab === "employers" ? filteredEmployers : candidates;
          return (
          <>
            {/* Header + tabs */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Gebruikers</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setUserTab("employers")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${userTab === "employers" ? "bg-purple-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                  >
                    Werkgevers <span className="ml-1 text-xs opacity-70">({employers.length})</span>
                  </button>
                  <button
                    onClick={() => setUserTab("candidates")}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${userTab === "candidates" ? "bg-purple-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                  >
                    Kandidaten <span className="ml-1 text-xs opacity-70">({candidates.length})</span>
                  </button>
                </div>
                {userTab === "employers" && (
                  <input
                    type="text"
                    value={employerSearch}
                    onChange={(e) => setEmployerSearch(e.target.value)}
                    placeholder="Zoek op naam of e-mail..."
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 min-w-[220px]"
                  />
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Naam</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
                    {userTab === "employers" && <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>}
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">Geen resultaten</td></tr>
                  )}
                  {list.map((u) => {
                    const rc = ROLE_COLORS[u.role] ?? { color: "#374151", bg: "#f3f4f6" };
                    return (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-800">{u.full_name || "—"}</td>
                        <td className="px-5 py-3 text-gray-500">{u.email}</td>
                        <td className="px-5 py-3">
                          <select value={u.role} onChange={(e) => handlePatchRole(u.id, e.target.value)}
                            className="text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-300"
                            style={{ color: rc.color, background: rc.bg }}>
                            <option value="candidate">candidate</option>
                            <option value="employer">employer</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        {userTab === "employers" && (
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-1">
                            <select value={u.plan || "gratis"} onChange={(e) => handlePatchPlan(u.id, e.target.value)}
                              className="text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-300"
                              style={{
                                color: u.plan === "premium" ? "#7c3aed" : u.plan === "normaal" ? "#0A66C2" : "#6b7280",
                                background: u.plan === "premium" ? "#ede9fe" : u.plan === "normaal" ? "#dbeafe" : "#f3f4f6",
                              }}>
                              <option value="gratis">gratis</option>
                              <option value="normaal">Growth</option>
                              <option value="premium">Scale</option>
                            </select>
                            {u.trial_ends_at && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#fef3c7", color: "#92400e" }}>
                                Gratis t/m {new Date(u.trial_ends_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                              </span>
                            )}
                          </div>
                        </td>
                        )}
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {u.role === "employer" && !u.trial_ends_at && (
                              <button onClick={() => handleGiveFreeTrial(u.id, u.email)}
                                className="text-xs text-purple-500 hover:text-purple-700 font-medium px-2 py-1 rounded hover:bg-purple-50 transition-colors whitespace-nowrap">
                                Gratis trial
                              </button>
                            )}
                            {u.trial_ends_at && (
                              <button onClick={() => handleRevokeFreeTrial(u.id, u.email)}
                                className="text-xs text-orange-400 hover:text-orange-600 font-medium px-2 py-1 rounded hover:bg-orange-50 transition-colors">
                                Trial intrekken
                              </button>
                            )}
                            <button onClick={() => handleResetPassword(u.id, u.email)}
                              className="text-xs text-blue-400 hover:text-blue-600 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                              Wachtwoord
                            </button>
                            <button onClick={() => handleDeleteUser(u.id, u.email)}
                              className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors">
                              Verwijder
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
          );
        })()}

        {/* ─── VACATURES ─── */}
        {view === "vacancies" && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Alle vacatures <span className="text-gray-400 text-lg font-normal">({vacancies.length})</span></h1>
            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
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
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "#f0fdfa", color: "#7C3AED" }}>{v.application_count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ─── PROMOTIES ─── */}
        {view === "promotions" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📢 Vacature Promoties</h1>
                <p className="text-sm text-gray-500 mt-1">Overzicht van alle betaalde vacature-promoties. Activeer of rond af.</p>
              </div>
              <button onClick={loadPromotions} className="text-sm text-purple-600 hover:text-purple-800 font-semibold px-3 py-1.5 rounded-lg hover:bg-purple-50 transition">
                Vernieuwen
              </button>
            </div>

            {promotionsLoading ? (
              <div className="text-gray-400 text-sm py-8 text-center">Laden...</div>
            ) : promotions.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
                Nog geen promoties.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Vacature</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Werkgever</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Duur</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Bedrag</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Betaald op</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotions.map((p) => {
                      const statusStyle: Record<string, { color: string; bg: string; label: string }> = {
                        pending_payment: { color: "#92400e", bg: "#fef3c7", label: "Wacht op betaling" },
                        paid:            { color: "#1e40af", bg: "#dbeafe", label: "Betaald" },
                        active:          { color: "#065f46", bg: "#d1fae5", label: "Actief" },
                        completed:       { color: "#6b7280", bg: "#f3f4f6", label: "Afgerond" },
                        cancelled:       { color: "#dc2626", bg: "#fee2e2", label: "Geannuleerd" },
                      };
                      const s = statusStyle[p.status] ?? statusStyle.completed;
                      return (
                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                          <td className="px-4 py-3 font-medium text-gray-900">{p.vacancy_title ?? `#${p.vacancy_id}`}</td>
                          <td className="px-4 py-3 text-gray-500">{p.employer_email ?? "—"}</td>
                          <td className="px-4 py-3 text-gray-700">{p.duration_days} dagen</td>
                          <td className="px-4 py-3 text-gray-700">€{p.total_price.toFixed(0)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: s.color, background: s.bg }}>
                              {s.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {p.paid_at ? new Date(p.paid_at).toLocaleDateString("nl-NL") : "—"}
                          </td>
                          <td className="px-4 py-3 flex gap-2 justify-end">
                            {p.status === "paid" && (
                              <button
                                onClick={() => handleActivatePromotion(p.id)}
                                className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition"
                                style={{ background: "#059669" }}
                              >
                                Activeren
                              </button>
                            )}
                            {p.status === "active" && (
                              <button
                                onClick={() => handleCompletePromotion(p.id)}
                                className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                              >
                                Afronden
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {/* ─── ANALYTICS ─── */}
        {view === "analytics" && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>

            {analyticsLoading ? (
              <div className="text-gray-400 text-sm">Laden...</div>
            ) : (
              <>
                {/* KPI kaarten */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Totale omzet", value: `€${totalRevenue.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`, color: "#059669" },
                    { label: "Actieve abonnementen", value: activeSubscriptions, color: "#7c3aed" },
                    { label: "Bezoekers (30d)", value: visitors.reduce((s, v) => s + v.visitors, 0), color: "#1d4ed8" },
                    { label: "Betalingen totaal", value: recentPayments.length >= 20 ? "20+" : recentPayments.length, color: "#d97706" },
                  ].map((k) => (
                    <div key={k.label} className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 truncate">{k.label}</div>
                      <div className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</div>
                    </div>
                  ))}
                </div>

                {/* Bezoekers grafiek */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
                  <h2 className="text-sm font-bold text-gray-700 mb-4">Dagelijkse bezoekers (30 dagen)</h2>
                  {visitors.length === 0 ? (
                    <p className="text-xs text-gray-400">Nog geen bezoekersdata.</p>
                  ) : (() => {
                    const max = Math.max(...visitors.map(v => v.visitors), 1);
                    return (
                      <div className="flex items-end gap-1 h-28 overflow-x-auto pb-1">
                        {visitors.map((v) => (
                          <div key={v.date} className="flex flex-col items-center flex-shrink-0 gap-1" style={{ minWidth: 20 }}>
                            <div
                              className="rounded-t w-full transition-all"
                              style={{ height: `${Math.max(2, Math.round((v.visitors / max) * 96))}px`, background: v.visitors > 0 ? "#7c3aed" : "#e5e7eb", minWidth: 12 }}
                              title={`${v.date}: ${v.visitors}`}
                            />
                            {visitors.indexOf(v) % 7 === 0 && (
                              <div className="text-[9px] text-gray-400 rotate-45 origin-left">{v.date.slice(5)}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Omzet per maand */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
                  <h2 className="text-sm font-bold text-gray-700 mb-4">Omzet per maand</h2>
                  {monthlyPayments.length === 0 ? (
                    <p className="text-xs text-gray-400">Nog geen betalingen geregistreerd.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[400px]">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 px-3 text-xs text-gray-400 font-semibold uppercase">Maand</th>
                            <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold uppercase">Betalingen</th>
                            <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold uppercase">Omzet</th>
                            <th className="text-left py-2 px-3 text-xs text-gray-400 font-semibold uppercase">Plannen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyPayments.map((m) => (
                            <tr key={m.month} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-2.5 px-3 font-medium text-gray-800">{m.month}</td>
                              <td className="py-2.5 px-3 text-right text-gray-600">{m.count}</td>
                              <td className="py-2.5 px-3 text-right font-semibold text-green-600">€{m.revenue.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</td>
                              <td className="py-2.5 px-3 text-xs text-gray-500">{Object.entries(m.plans).map(([p, n]) => `${p}×${n}`).join(", ")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Registraties per maand */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
                  <h2 className="text-sm font-bold text-gray-700 mb-4">Nieuwe registraties per maand</h2>
                  {monthlySignups.length === 0 ? (
                    <p className="text-xs text-gray-400">Nog geen registraties.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[360px]">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 px-3 text-xs text-gray-400 font-semibold uppercase">Maand</th>
                            <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold uppercase">Kandidaten</th>
                            <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold uppercase">Werkgevers</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlySignups.map((m) => (
                            <tr key={m.month} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-2.5 px-3 font-medium text-gray-800">{m.month}</td>
                              <td className="py-2.5 px-3 text-right text-blue-600 font-semibold">{m.candidates}</td>
                              <td className="py-2.5 px-3 text-right text-purple-600 font-semibold">{m.employers}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Recente betalingen */}
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                  <h2 className="text-sm font-bold text-gray-700 mb-4">Recente betalingen</h2>
                  {recentPayments.length === 0 ? (
                    <p className="text-xs text-gray-400">Nog geen betalingen.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[560px]">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 px-3 text-xs text-gray-400 font-semibold uppercase">Factuur</th>
                            <th className="text-left py-2 px-3 text-xs text-gray-400 font-semibold uppercase">Klant</th>
                            <th className="text-left py-2 px-3 text-xs text-gray-400 font-semibold uppercase">Plan</th>
                            <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold uppercase">Bedrag</th>
                            <th className="text-left py-2 px-3 text-xs text-gray-400 font-semibold uppercase">Datum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentPayments.map((p) => (
                            <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-2.5 px-3 font-mono text-xs text-gray-500">{p.invoice_number || "—"}</td>
                              <td className="py-2.5 px-3 text-gray-700 truncate max-w-[160px]">{p.user_email || "—"}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{
                                  background: p.plan === "premium" ? "#f5f3ff" : p.plan === "normaal" ? "#dbeafe" : "#f0fdf4",
                                  color: p.plan === "premium" ? "#7c3aed" : p.plan === "normaal" ? "#1d4ed8" : "#15803d",
                                }}>
                                  {p.plan || "—"}{p.interval ? ` / ${p.interval}` : ""}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-green-600">€{(p.amount_total ?? 0).toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-xs text-gray-400">{p.created_at ? p.created_at.slice(0, 10) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

      </main>
    </div>
  );
}
