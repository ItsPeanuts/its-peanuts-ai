"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

const AVATAR_COLORS = ["bg-teal-500", "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-green-500"];
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }
function getInitials(title: string) {
  return title.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default function EmployerPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const role = useMemo(() => getRole(), []);

  const [userEmail, setUserEmail] = useState("");
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loadingVacancies, setLoadingVacancies] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [hours, setHours] = useState("");
  const [salary, setSalary] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    if (!token) {
      router.push("/candidate/login");
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
        const list = await employerVacancies(token);
        setVacancies(list || []);
      } catch {
        clearSession();
        router.push("/candidate/login");
      }
    })();
  }, [router, role, token]);

  async function refreshVacancies() {
    setErr("");
    setMsg("");
    setLoadingVacancies(true);
    try {
      const list = await employerVacancies(token);
      setVacancies(list || []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Kon vacatures niet laden");
    } finally {
      setLoadingVacancies(false);
    }
  }

  async function doCreateVacancy(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setCreating(true);
    try {
      await createVacancy(token, { title, location, hours_per_week: hours, salary_range: salary, description: desc });
      setMsg("Vacature succesvol aangemaakt!");
      setTitle(""); setLocation(""); setHours(""); setSalary(""); setDesc("");
      setShowForm(false);
      await refreshVacancies();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Aanmaken mislukt");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Werkgevers Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">{userEmail}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "#f97316" }}
            >
              + Vacature plaatsen
            </button>
            <button
              onClick={() => { clearSession(); router.push("/"); }}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:border-gray-300 transition-all"
            >
              Uitloggen
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-5 mb-8">
          {[
            { label: "Actieve vacatures", value: vacancies.length, icon: "📋", color: "#0DA89E", bg: "#e8f8f7" },
            { label: "Totaal sollicitanten", value: "—", icon: "👥", color: "#3b82f6", bg: "#eff6ff" },
            { label: "AI-gescreend", value: "—", icon: "🤖", color: "#8b5cf6", bg: "#f5f3ff" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-xl">{s.icon}</div>
                <span className="text-sm text-gray-500">{s.label}</span>
              </div>
              <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {msg && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm mb-5">
            {msg}
          </div>
        )}
        {err && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mb-5">
            {err}
          </div>
        )}

        {/* Create vacancy form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-5">Nieuwe vacature plaatsen</h2>
            <form onSubmit={doCreateVacancy} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Functietitel *</label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="bijv. Senior Developer"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Locatie</label>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="bijv. Amsterdam"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Uren per week</label>
                  <input
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="bijv. 40"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Salarisrange</label>
                  <input
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="bijv. €3.500 - €5.000"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Omschrijving</label>
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={4}
                    placeholder="Beschrijf de functie, vereisten en wat je bedrijf te bieden heeft..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 hover:opacity-90"
                  style={{ background: "#0DA89E" }}
                >
                  {creating ? "Aanmaken..." : "Vacature aanmaken"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Vacatures list */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Mijn vacatures</h2>
            <button
              onClick={refreshVacancies}
              disabled={loadingVacancies}
              className="text-xs text-teal-600 font-medium hover:text-teal-700 disabled:opacity-50"
            >
              {loadingVacancies ? "Laden..." : "↻ Vernieuwen"}
            </button>
          </div>

          {vacancies.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="font-semibold text-gray-700 mb-1">Nog geen vacatures</p>
              <p className="text-sm text-gray-400 mb-4">Plaats je eerste vacature en vind de beste kandidaten.</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90"
                style={{ background: "#f97316" }}
              >
                + Vacature plaatsen
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {vacancies.map((v) => {
                const color = avatarColor(v.id);
                const initials = getInitials(v.title);
                return (
                  <div key={v.id} className="p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{v.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {v.location && `${v.location} · `}
                        {v.hours_per_week && `${v.hours_per_week}u/week · `}
                        {v.salary_range || ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 font-medium">Actief</span>
                      <Link
                        href={`/vacatures/${v.id}`}
                        className="text-xs text-gray-500 hover:text-teal-600 no-underline font-medium"
                      >
                        Bekijken →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
