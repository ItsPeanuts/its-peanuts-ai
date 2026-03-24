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
type AdminUser = { id: number; email: string; full_name: string | null; role: string; plan: string | null; };
type AdminVacancy = { id: number; title: string; location: string | null; employer_id: number; employer_email: string; application_count: number; };

type SalesLead = {
  id: number; company_name: string; sector: string | null; company_size: string | null;
  contact_name: string | null; contact_role: string | null; channel: string | null;
  language: string | null; subject: string | null; message: string | null;
  follow_up: string | null; key_usps: string[] | null; status: string;
  internal_notes: string | null; created_at: string | null;
};
type MarketingPost = { content: string; hashtags: string[]; image_prompt: string; };
type MarketingContent = {
  id: number; platform: string | null; audience: string | null; topic: string | null;
  tone: string | null; language: string | null; posts: MarketingPost[] | null;
  calendar_tip: string | null; status: string; created_at: string | null;
};

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  admin:     { color: "#7c3aed", bg: "#f5f3ff" },
  employer:  { color: "#7C3AED", bg: "#f0fdfa" },
  candidate: { color: "#1d4ed8", bg: "#dbeafe" },
};

const LEAD_STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  generated: { color: "#92400e", bg: "#fef3c7", label: "Gegenereerd" },
  sent:      { color: "#1e40af", bg: "#dbeafe", label: "Verstuurd" },
  replied:   { color: "#065f46", bg: "#d1fae5", label: "Gereageerd" },
  converted: { color: "#5b21b6", bg: "#ede9fe", label: "Klant geworden" },
  archived:  { color: "#6b7280", bg: "#f3f4f6", label: "Gearchiveerd" },
};

const MARKETING_STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  draft:     { color: "#92400e", bg: "#fef3c7", label: "Concept" },
  scheduled: { color: "#1e40af", bg: "#dbeafe", label: "Ingepland" },
  published: { color: "#065f46", bg: "#d1fae5", label: "Gepubliceerd" },
};

const PLATFORM_STYLE: Record<string, { color: string; bg: string; emoji: string }> = {
  linkedin:  { color: "#0A66C2", bg: "#dbeafe", emoji: "💼" },
  instagram: { color: "#E4405F", bg: "#fee2e2", emoji: "📸" },
  twitter:   { color: "#1DA1F2", bg: "#e0f2fe", emoji: "🐦" },
  facebook:  { color: "#1877F2", bg: "#dbeafe", emoji: "📘" },
};

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  linkedin: "LinkedIn DM",
  phone_script: "Belscript",
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
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || "API fout");
  return data;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setToken(getToken());
    setRole(getRole());
  }, []);

  const [view, setView] = useState<"stats" | "users" | "vacancies" | "sales" | "marketing">("stats");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [vacancies, setVacancies] = useState<AdminVacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");

  // Sales state
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [expandedLead, setExpandedLead] = useState<number | null>(null);
  const [generatingSales, setGeneratingSales] = useState(false);
  const [salesForm, setSalesForm] = useState({
    company_name: "", sector: "", company_size: "medium",
    contact_name: "", contact_role: "", channel: "email",
    language: "nl", custom_notes: "",
  });

  // Marketing state
  const [marketingList, setMarketingList] = useState<MarketingContent[]>([]);
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [expandedMarketing, setExpandedMarketing] = useState<number | null>(null);
  const [generatingMarketing, setGeneratingMarketing] = useState(false);
  const [marketingForm, setMarketingForm] = useState({
    platform: "linkedin", audience: "both", topic: "",
    tone: "professional", count: 3, language: "nl",
  });

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
    if (view === "sales" && token) loadLeads();
    if (view === "marketing" && token) loadMarketing();
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

  async function handleDeleteUser(userId: number, email: string) {
    if (!token || !confirm(`Weet je zeker dat je ${email} wilt verwijderen?`)) return;
    try {
      await apiFetch(token, `/admin/users/${userId}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setMsg("Gebruiker verwijderd"); setTimeout(() => setMsg(""), 3000);
    } catch (e) { showErr(e); }
  }

  // ── Sales Agent handlers ───────────────────────────────────────────────────

  async function loadLeads() {
    if (!token) return;
    setLeadsLoading(true);
    try {
      const data = await apiFetch(token, "/admin/agents/sales");
      setLeads(data);
    } catch (e) { showErr(e); }
    finally { setLeadsLoading(false); }
  }

  async function handleGenerateSales(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !salesForm.company_name || !salesForm.sector) return;
    setGeneratingSales(true); setErr("");
    try {
      const lead = await apiFetch(token, "/admin/agents/sales", {
        method: "POST", body: JSON.stringify(salesForm),
      });
      setLeads((prev) => [lead, ...prev]);
      setExpandedLead(lead.id);
      setMsg("Outreach gegenereerd en opgeslagen!");
      setTimeout(() => setMsg(""), 4000);
    } catch (e) { showErr(e); }
    finally { setGeneratingSales(false); }
  }

  async function handlePatchLead(id: number, updates: { status?: string; internal_notes?: string }) {
    if (!token) return;
    try {
      const updated = await apiFetch(token, `/admin/agents/sales/${id}`, {
        method: "PATCH", body: JSON.stringify(updates),
      });
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } catch (e) { showErr(e); }
  }

  async function handleDeleteLead(id: number) {
    if (!token || !confirm("Lead verwijderen?")) return;
    try {
      await apiFetch(token, `/admin/agents/sales/${id}`, { method: "DELETE" });
      setLeads((prev) => prev.filter((l) => l.id !== id));
      if (expandedLead === id) setExpandedLead(null);
      setMsg("Lead verwijderd"); setTimeout(() => setMsg(""), 3000);
    } catch (e) { showErr(e); }
  }

  // ── Marketing Agent handlers ───────────────────────────────────────────────

  async function loadMarketing() {
    if (!token) return;
    setMarketingLoading(true);
    try {
      const data = await apiFetch(token, "/admin/agents/marketing");
      setMarketingList(data);
    } catch (e) { showErr(e); }
    finally { setMarketingLoading(false); }
  }

  async function handleGenerateMarketing(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !marketingForm.topic) return;
    setGeneratingMarketing(true); setErr("");
    try {
      const mc = await apiFetch(token, "/admin/agents/marketing", {
        method: "POST", body: JSON.stringify({ ...marketingForm, count: Number(marketingForm.count) }),
      });
      setMarketingList((prev) => [mc, ...prev]);
      setExpandedMarketing(mc.id);
      setMsg(`${mc.posts?.length || 0} posts gegenereerd en opgeslagen!`);
      setTimeout(() => setMsg(""), 4000);
    } catch (e) { showErr(e); }
    finally { setGeneratingMarketing(false); }
  }

  async function handlePatchMarketing(id: number, updates: { status?: string }) {
    if (!token) return;
    try {
      const updated = await apiFetch(token, `/admin/agents/marketing/${id}`, {
        method: "PATCH", body: JSON.stringify(updates),
      });
      setMarketingList((prev) => prev.map((m) => (m.id === id ? updated : m)));
    } catch (e) { showErr(e); }
  }

  async function handleDeleteMarketing(id: number) {
    if (!token || !confirm("Content verwijderen?")) return;
    try {
      await apiFetch(token, `/admin/agents/marketing/${id}`, { method: "DELETE" });
      setMarketingList((prev) => prev.filter((m) => m.id !== id));
      if (expandedMarketing === id) setExpandedMarketing(null);
      setMsg("Content verwijderd"); setTimeout(() => setMsg(""), 3000);
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col min-h-screen flex-shrink-0">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: "#7c3aed" }}>A</div>
            <span className="font-bold text-gray-900 text-sm">Admin Panel</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">VorzaIQ</div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {([
            { id: "stats",     label: "Dashboard",        icon: "📊" },
            { id: "users",     label: "Gebruikers",        icon: "👥" },
            { id: "vacancies", label: "Vacatures",          icon: "📋" },
            { id: "sales",     label: "Sales Agent",        icon: "🎯" },
            { id: "marketing", label: "Marketing Agent",    icon: "📣" },
          ] as const).map((item) => (
            <button
              key={item.id}
              onClick={() => { setErr(""); setMsg(""); setView(item.id); }}
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
      <main className="flex-1 p-8 overflow-auto">
        {msg && <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm mb-5">{msg}</div>}
        {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mb-5 cursor-pointer" onClick={() => setErr("")}>{err} ✕</div>}

        {/* ─── DASHBOARD ─── */}
        {view === "stats" && stats && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform overzicht</h1>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: "Gebruikers",      value: stats.total_users,        color: "#7c3aed" },
                { label: "Kandidaten",      value: stats.total_candidates,   color: "#1d4ed8" },
                { label: "Werkgevers",      value: stats.total_employers,    color: "#7C3AED" },
                { label: "Vacatures",       value: stats.total_vacancies,    color: "#d97706" },
                { label: "Sollicitaties",   value: stats.total_applications, color: "#059669" },
                { label: "Interviews",      value: stats.total_interviews,   color: "#0891b2" },
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
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: rc.color, background: rc.bg }}>{u.role}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ─── GEBRUIKERS ─── */}
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
                          <select value={u.role} onChange={(e) => handlePatchRole(u.id, e.target.value)}
                            className="text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-300"
                            style={{ color: rc.color, background: rc.bg }}>
                            <option value="candidate">candidate</option>
                            <option value="employer">employer</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <select value={u.plan || "gratis"} onChange={(e) => handlePatchPlan(u.id, e.target.value)}
                            className="text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-300"
                            style={{
                              color: u.plan === "premium" ? "#7c3aed" : u.plan === "normaal" ? "#0A66C2" : "#6b7280",
                              background: u.plan === "premium" ? "#ede9fe" : u.plan === "normaal" ? "#dbeafe" : "#f3f4f6",
                            }}>
                            <option value="gratis">gratis</option>
                            <option value="normaal">normaal</option>
                            <option value="premium">premium</option>
                          </select>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => handleDeleteUser(u.id, u.email)}
                            className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors">
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

        {/* ─── VACATURES ─── */}
        {view === "vacancies" && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Alle vacatures <span className="text-gray-400 text-lg font-normal">({vacancies.length})</span></h1>
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
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "#f0fdfa", color: "#7C3AED" }}>{v.application_count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ─── SALES AGENT ─── */}
        {view === "sales" && (
          <>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🎯 Sales Agent</h1>
                <p className="text-sm text-gray-500 mt-1">Genereer gepersonaliseerde outreach voor potentiële werkgever-klanten. Alleen zichtbaar voor admins.</p>
              </div>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">Admin only</span>
            </div>

            {/* Genereer formulier */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6 mt-4">
              <h2 className="text-sm font-bold text-gray-700 mb-4">Nieuwe outreach genereren</h2>
              <form onSubmit={handleGenerateSales} className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Bedrijfsnaam *</label>
                  <input required value={salesForm.company_name}
                    onChange={(e) => setSalesForm((f) => ({ ...f, company_name: e.target.value }))}
                    placeholder="bijv. ACME Logistics BV"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Sector *</label>
                  <input required value={salesForm.sector}
                    onChange={(e) => setSalesForm((f) => ({ ...f, sector: e.target.value }))}
                    placeholder="bijv. Logistiek, IT, Retail"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Bedrijfsgrootte</label>
                  <select value={salesForm.company_size}
                    onChange={(e) => setSalesForm((f) => ({ ...f, company_size: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                    <option value="small">Klein (&lt;25 medewerkers)</option>
                    <option value="medium">Middelgroot (25–200)</option>
                    <option value="large">Groot (&gt;200)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Contactpersoon</label>
                  <input value={salesForm.contact_name}
                    onChange={(e) => setSalesForm((f) => ({ ...f, contact_name: e.target.value }))}
                    placeholder="bijv. Jan de Vries"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Functie contactpersoon</label>
                  <input value={salesForm.contact_role}
                    onChange={(e) => setSalesForm((f) => ({ ...f, contact_role: e.target.value }))}
                    placeholder="bijv. HR Manager, Directeur"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Kanaal</label>
                  <select value={salesForm.channel}
                    onChange={(e) => setSalesForm((f) => ({ ...f, channel: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                    <option value="email">Email</option>
                    <option value="linkedin">LinkedIn DM</option>
                    <option value="phone_script">Belscript</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Taal</label>
                  <select value={salesForm.language}
                    onChange={(e) => setSalesForm((f) => ({ ...f, language: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                    <option value="nl">Nederlands</option>
                    <option value="en">Engels</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Extra context (optioneel)</label>
                  <input value={salesForm.custom_notes}
                    onChange={(e) => setSalesForm((f) => ({ ...f, custom_notes: e.target.value }))}
                    placeholder="bijv. Ze plaatsen regelmatig vacatures op LinkedIn en zoeken IT-talent"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={generatingSales}
                    className="w-full px-4 py-2 rounded-lg text-sm font-bold text-white transition-opacity disabled:opacity-50"
                    style={{ background: "#7c3aed" }}>
                    {generatingSales ? "AI genereert..." : "🤖 Genereer outreach"}
                  </button>
                </div>
              </form>
            </div>

            {/* Leads lijst */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-700">Gegenereerde leads <span className="text-gray-400 font-normal">({leads.length})</span></h2>
                <button onClick={loadLeads} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors">↻ Vernieuwen</button>
              </div>

              {leadsLoading ? (
                <div className="px-5 py-10 text-center text-gray-400 text-sm">Laden...</div>
              ) : leads.length === 0 ? (
                <div className="px-5 py-12 text-center text-gray-400 text-sm">Nog geen leads. Genereer je eerste outreach hierboven.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {leads.map((lead) => {
                    const st = LEAD_STATUS_STYLE[lead.status] ?? LEAD_STATUS_STYLE.generated;
                    const isOpen = expandedLead === lead.id;
                    return (
                      <div key={lead.id}>
                        {/* Row */}
                        <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setExpandedLead(isOpen ? null : lead.id)}>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 text-sm">{lead.company_name}</div>
                            <div className="text-xs text-gray-400">{lead.sector} · {CHANNEL_LABEL[lead.channel || ""] || lead.channel}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <select
                              value={lead.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handlePatchLead(lead.id, { status: e.target.value })}
                              className="text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none"
                              style={{ color: st.color, background: st.bg }}>
                              <option value="generated">Gegenereerd</option>
                              <option value="sent">Verstuurd</option>
                              <option value="replied">Gereageerd</option>
                              <option value="converted">Klant geworden</option>
                              <option value="archived">Gearchiveerd</option>
                            </select>
                            <span className="text-xs text-gray-300">
                              {lead.created_at ? new Date(lead.created_at).toLocaleDateString("nl-NL") : ""}
                            </span>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }}
                              className="text-red-300 hover:text-red-500 text-sm px-1 py-0.5 rounded hover:bg-red-50 transition-colors">✕</button>
                            <span className="text-gray-300 text-xs">{isOpen ? "▲" : "▼"}</span>
                          </div>
                        </div>

                        {/* Detail */}
                        {isOpen && (
                          <div className="px-5 pb-5 bg-gray-50 border-t border-gray-100 space-y-4">
                            {/* Key USPs */}
                            {lead.key_usps && lead.key_usps.length > 0 && (
                              <div className="pt-4">
                                <div className="text-xs font-semibold text-gray-500 mb-2">Relevante USPs</div>
                                <div className="flex flex-wrap gap-2">
                                  {lead.key_usps.map((usp, i) => (
                                    <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{usp}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Subject (alleen email) */}
                            {lead.channel === "email" && lead.subject && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-semibold text-gray-500">Onderwerpregel</span>
                                  <button onClick={() => copyText(lead.subject!, "subject")}
                                    className="text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-0.5 rounded hover:bg-purple-50 transition-colors">
                                    {copied === "subject" ? "✓ Gekopieerd" : "Kopieer"}
                                  </button>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-medium">{lead.subject}</div>
                              </div>
                            )}

                            {/* Message */}
                            {lead.message && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-semibold text-gray-500">
                                    {lead.channel === "email" ? "E-mailbericht" : lead.channel === "linkedin" ? "LinkedIn DM" : "Belscript"}
                                  </span>
                                  <button onClick={() => copyText(lead.message!, "message")}
                                    className="text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-0.5 rounded hover:bg-purple-50 transition-colors">
                                    {copied === "message" ? "✓ Gekopieerd" : "Kopieer"}
                                  </button>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{lead.message}</div>
                              </div>
                            )}

                            {/* Follow-up */}
                            {lead.follow_up && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-semibold text-gray-500">Opvolgbericht (3-5 dagen later)</span>
                                  <button onClick={() => copyText(lead.follow_up!, "followup")}
                                    className="text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-0.5 rounded hover:bg-purple-50 transition-colors">
                                    {copied === "followup" ? "✓ Gekopieerd" : "Kopieer"}
                                  </button>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{lead.follow_up}</div>
                              </div>
                            )}

                            {/* Interne notities */}
                            <div>
                              <label className="text-xs font-semibold text-gray-500 mb-1 block">Interne notities</label>
                              <textarea
                                defaultValue={lead.internal_notes || ""}
                                onBlur={(e) => handlePatchLead(lead.id, { internal_notes: e.target.value })}
                                placeholder="Voeg notities toe (bijv. wanneer verstuurd, reactie ontvangen)"
                                rows={2}
                                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── MARKETING AGENT ─── */}
        {view === "marketing" && (
          <>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📣 Marketing Agent</h1>
                <p className="text-sm text-gray-500 mt-1">Genereer social media content voor LinkedIn, Instagram, Twitter/X en Facebook. Alleen zichtbaar voor admins.</p>
              </div>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">Admin only</span>
            </div>

            {/* Genereer formulier */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6 mt-4">
              <h2 className="text-sm font-bold text-gray-700 mb-4">Nieuwe content genereren</h2>
              <form onSubmit={handleGenerateMarketing} className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Platform</label>
                  <select value={marketingForm.platform}
                    onChange={(e) => setMarketingForm((f) => ({ ...f, platform: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                    <option value="linkedin">💼 LinkedIn</option>
                    <option value="instagram">📸 Instagram</option>
                    <option value="twitter">🐦 Twitter/X</option>
                    <option value="facebook">📘 Facebook</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Doelgroep</label>
                  <select value={marketingForm.audience}
                    onChange={(e) => setMarketingForm((f) => ({ ...f, audience: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                    <option value="both">Werkgevers én kandidaten</option>
                    <option value="employers">Werkgevers</option>
                    <option value="candidates">Kandidaten</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Toon</label>
                  <select value={marketingForm.tone}
                    onChange={(e) => setMarketingForm((f) => ({ ...f, tone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                    <option value="professional">Professioneel</option>
                    <option value="casual">Casual</option>
                    <option value="inspiring">Inspirerend</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Onderwerp / thema *</label>
                  <input required value={marketingForm.topic}
                    onChange={(e) => setMarketingForm((f) => ({ ...f, topic: e.target.value }))}
                    placeholder="bijv. AI pre-screening, sneller solliciteren, video interviews, Lisa AI"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Aantal posts (1-5)</label>
                    <input type="number" min={1} max={5} value={marketingForm.count}
                      onChange={(e) => setMarketingForm((f) => ({ ...f, count: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Taal</label>
                    <select value={marketingForm.language}
                      onChange={(e) => setMarketingForm((f) => ({ ...f, language: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                      <option value="nl">Nederlands</option>
                      <option value="en">Engels</option>
                    </select>
                  </div>
                </div>
                <div className="col-span-3 flex justify-end">
                  <button type="submit" disabled={generatingMarketing}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-opacity disabled:opacity-50"
                    style={{ background: "#7c3aed" }}>
                    {generatingMarketing ? "AI genereert content..." : "🤖 Genereer content"}
                  </button>
                </div>
              </form>
            </div>

            {/* Content lijst */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-700">Gegenereerde content <span className="text-gray-400 font-normal">({marketingList.length})</span></h2>
                <button onClick={loadMarketing} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors">↻ Vernieuwen</button>
              </div>

              {marketingLoading ? (
                <div className="px-5 py-10 text-center text-gray-400 text-sm">Laden...</div>
              ) : marketingList.length === 0 ? (
                <div className="px-5 py-12 text-center text-gray-400 text-sm">Nog geen content. Genereer je eerste posts hierboven.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {marketingList.map((mc) => {
                    const ps = PLATFORM_STYLE[mc.platform || ""] ?? { color: "#6b7280", bg: "#f3f4f6", emoji: "📱" };
                    const st = MARKETING_STATUS_STYLE[mc.status] ?? MARKETING_STATUS_STYLE.draft;
                    const isOpen = expandedMarketing === mc.id;
                    return (
                      <div key={mc.id}>
                        {/* Row */}
                        <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setExpandedMarketing(isOpen ? null : mc.id)}>
                          <span className="text-xl">{ps.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 text-sm truncate">{mc.topic}</div>
                            <div className="text-xs text-gray-400">
                              <span className="font-semibold" style={{ color: ps.color }}>{mc.platform}</span>
                              {" · "}{mc.posts?.length || 0} posts · {mc.audience}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <select
                              value={mc.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handlePatchMarketing(mc.id, { status: e.target.value })}
                              className="text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none"
                              style={{ color: st.color, background: st.bg }}>
                              <option value="draft">Concept</option>
                              <option value="scheduled">Ingepland</option>
                              <option value="published">Gepubliceerd</option>
                            </select>
                            <span className="text-xs text-gray-300">
                              {mc.created_at ? new Date(mc.created_at).toLocaleDateString("nl-NL") : ""}
                            </span>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteMarketing(mc.id); }}
                              className="text-red-300 hover:text-red-500 text-sm px-1 py-0.5 rounded hover:bg-red-50 transition-colors">✕</button>
                            <span className="text-gray-300 text-xs">{isOpen ? "▲" : "▼"}</span>
                          </div>
                        </div>

                        {/* Detail */}
                        {isOpen && (
                          <div className="px-5 pb-5 bg-gray-50 border-t border-gray-100 space-y-4 pt-4">
                            {/* Calendar tip */}
                            {mc.calendar_tip && (
                              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 text-sm text-blue-700">
                                📅 <strong>Beste posttijd:</strong> {mc.calendar_tip}
                              </div>
                            )}

                            {/* Posts */}
                            {mc.posts && mc.posts.map((post, pi) => (
                              <div key={pi} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base">{ps.emoji}</span>
                                    <span className="text-xs font-bold text-gray-600">Post {pi + 1}</span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const fullText = post.hashtags.length
                                        ? `${post.content}\n\n${post.hashtags.join(" ")}`
                                        : post.content;
                                      copyText(fullText, `post-${mc.id}-${pi}`);
                                    }}
                                    className="text-xs text-purple-600 hover:text-purple-800 font-semibold px-3 py-1 rounded-lg hover:bg-purple-50 transition-colors">
                                    {copied === `post-${mc.id}-${pi}` ? "✓ Gekopieerd!" : "📋 Kopieer post"}
                                  </button>
                                </div>
                                <div className="p-4 space-y-3">
                                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>

                                  {post.hashtags && post.hashtags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {post.hashtags.map((h, hi) => (
                                        <span key={hi} className="text-xs font-medium px-2 py-0.5 rounded-full"
                                          style={{ color: ps.color, background: ps.bg }}>
                                          {h.startsWith("#") ? h : `#${h}`}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {post.image_prompt && (
                                    <div className="border border-dashed border-gray-200 rounded-lg px-3 py-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-400">🎨 AI Image prompt (DALL-E / Midjourney)</span>
                                        <button onClick={() => copyText(post.image_prompt, `img-${mc.id}-${pi}`)}
                                          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors">
                                          {copied === `img-${mc.id}-${pi}` ? "✓" : "Kopieer"}
                                        </button>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1 italic">{post.image_prompt}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
