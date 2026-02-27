"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { me, getMyApplications, ApplicationWithDetails } from "@/lib/api";
import { clearSession, getToken, getRole } from "@/lib/session";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  applied:     { label: "In behandeling", color: "#6b7280", bg: "#f3f4f6" },
  shortlisted: { label: "Geselecteerd",   color: "#1d4ed8", bg: "#dbeafe" },
  interview:   { label: "Interview",      color: "#d97706", bg: "#fef3c7" },
  hired:       { label: "Aangenomen",     color: "#059669", bg: "#d1fae5" },
  rejected:    { label: "Afgewezen",      color: "#dc2626", bg: "#fee2e2" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, color: "#374151", bg: "#f3f4f6" };
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400">—</span>;
  const color = score >= 70 ? "#059669" : score >= 40 ? "#d97706" : "#dc2626";
  const bg = score >= 70 ? "#d1fae5" : score >= 40 ? "#fef3c7" : "#fee2e2";
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full border" style={{ color, background: bg, borderColor: color }}>
      {score}%
    </span>
  );
}

export default function CandidateDashboard() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const role = useMemo(() => getRole(), []);

  const [userName, setUserName] = useState("");
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.replace("/candidate/login");
      return;
    }
    if (role && role !== "candidate") {
      router.replace("/employer");
      return;
    }
    (async () => {
      try {
        const [user, apps] = await Promise.all([
          me(token),
          getMyApplications(token),
        ]);
        setUserName(user.full_name || user.email);
        setApplications(apps);
      } catch {
        clearSession();
        router.replace("/candidate/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, token, role]);

  const stats = {
    total: applications.length,
    inProgress: applications.filter((a) => a.status === "applied" || a.status === "shortlisted").length,
    interview: applications.filter((a) => a.status === "interview").length,
    avgScore: (() => {
      const scored = applications.filter((a) => a.match_score !== null);
      if (!scored.length) return null;
      return Math.round(scored.reduce((s, a) => s + (a.match_score ?? 0), 0) / scored.length);
    })(),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sub-nav */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center gap-1">
          {[
            { label: "Dashboard", href: "/candidate" },
            { label: "Sollicitaties", href: "/candidate/sollicitaties" },
            { label: "CV Beheer", href: "/candidate/cv" },
            { label: "Vacatures", href: "/vacatures" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-teal-600 hover:bg-teal-50 transition-colors no-underline"
            >
              {item.label}
            </Link>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-500">{userName}</span>
            <button
              onClick={() => { clearSession(); router.push("/"); }}
              className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
            >
              Uitloggen
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welkomst header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welkom terug, {userName.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Dit is je sollicitatie-dashboard. Hier zie je al je activiteit in een oogopslag.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-5 mb-8">
          {[
            { label: "Totaal", value: stats.total, color: "#0DA89E", bg: "#e8f8f7", icon: "📋" },
            { label: "In behandeling", value: stats.inProgress, color: "#d97706", bg: "#fffbeb", icon: "⏳" },
            { label: "Interview", value: stats.interview, color: "#7c3aed", bg: "#f5f3ff", icon: "🎤" },
            { label: "Gem. AI-score", value: stats.avgScore !== null ? `${stats.avgScore}%` : "—", color: "#059669", bg: "#ecfdf5", icon: "🤖" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{stat.icon}</span>
                <span className="text-sm text-gray-500">{stat.label}</span>
              </div>
              <div className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Recente sollicitaties */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">Recente sollicitaties</h2>
              <Link href="/candidate/sollicitaties" className="text-xs text-teal-600 font-semibold no-underline hover:text-teal-700">
                Alle bekijken →
              </Link>
            </div>

            {applications.length === 0 ? (
              <div className="py-10 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="font-semibold text-gray-700 mb-1">Nog geen sollicitaties</p>
                <p className="text-sm text-gray-400 mb-4">Bekijk openstaande vacatures en solliciteer!</p>
                <Link
                  href="/vacatures"
                  className="inline-block px-5 py-2 rounded-xl text-sm font-bold text-white no-underline hover:opacity-90"
                  style={{ background: "#0DA89E" }}
                >
                  Zoek vacatures
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.slice(0, 4).map((app) => (
                  <Link
                    key={app.application_id}
                    href={`/candidate/sollicitaties/${app.application_id}`}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl no-underline border border-transparent hover:border-teal-100 hover:bg-teal-50/30 transition-all group"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 text-sm group-hover:text-teal-700 transition-colors">{app.vacancy_title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {app.vacancy_location || "Locatie onbekend"} · {new Date(app.created_at).toLocaleDateString("nl-NL")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ScoreBadge score={app.match_score} />
                      <StatusBadge status={app.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Acties sidebar */}
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-4">Snelle acties</h2>
              <div className="space-y-3">
                <Link
                  href="/vacatures"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white no-underline hover:opacity-90 transition-all"
                  style={{ background: "#0DA89E" }}
                >
                  <span>🔍</span> Zoek vacatures
                </Link>
                <Link
                  href="/candidate/cv"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 no-underline transition-colors"
                >
                  <span>📄</span> Upload CV
                </Link>
                <Link
                  href="/candidate/sollicitaties"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 no-underline transition-colors"
                >
                  <span>📋</span> Alle sollicitaties
                </Link>
              </div>
            </div>

            {/* AI Banner */}
            <div className="rounded-xl p-5 text-white" style={{ background: "linear-gradient(135deg, #0DA89E, #0891b2)" }}>
              <div className="text-sm font-bold mb-2">🤖 AI-matching actief</div>
              <div className="text-xs opacity-85 leading-relaxed">
                Onze AI analyseert jouw CV en matcht het automatisch met de beste vacatures voor jou.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
