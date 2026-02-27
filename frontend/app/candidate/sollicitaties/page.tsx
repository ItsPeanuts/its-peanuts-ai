"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMyApplications, ApplicationWithDetails } from "@/lib/api";
import { clearSession, getToken, getRole } from "@/lib/session";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  applied:     { label: "In behandeling", color: "#6b7280", bg: "#f3f4f6" },
  shortlisted: { label: "Geselecteerd",   color: "#1d4ed8", bg: "#dbeafe" },
  interview:   { label: "Interview",      color: "#d97706", bg: "#fef3c7" },
  hired:       { label: "Aangenomen",     color: "#059669", bg: "#d1fae5" },
  rejected:    { label: "Afgewezen",      color: "#dc2626", bg: "#fee2e2" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: "#374151", bg: "#f3f4f6" };
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function ScoreCircle({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400 font-semibold flex-shrink-0">
        —
      </div>
    );
  }
  const color = score >= 70 ? "#059669" : score >= 40 ? "#d97706" : "#dc2626";
  const bg = score >= 70 ? "#d1fae5" : score >= 40 ? "#fef3c7" : "#fee2e2";
  return (
    <div className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2" style={{ color, background: bg, borderColor: color }}>
      {score}
    </div>
  );
}

export default function SollicitatiePage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const role = useMemo(() => getRole(), []);

  const [apps, setApps] = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { router.replace("/candidate/login"); return; }
    if (role && role !== "candidate") { router.replace("/employer"); return; }

    getMyApplications(token)
      .then(setApps)
      .catch((e) => {
        if (e?.message?.includes("401") || e?.message?.includes("403")) {
          clearSession();
          router.replace("/candidate/login");
        } else {
          setError(e?.message || "Kon sollicitaties niet laden");
        }
      })
      .finally(() => setLoading(false));
  }, [router, token, role]);

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
              className={`px-4 py-2 rounded-lg text-sm font-medium no-underline transition-colors ${
                item.href === "/candidate/sollicitaties"
                  ? "text-teal-600 bg-teal-50"
                  : "text-gray-600 hover:text-teal-600 hover:bg-teal-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="ml-auto">
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mijn sollicitaties</h1>
          <p className="text-gray-500 text-sm mt-1">Overzicht van al je ingediende sollicitaties</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Laden...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mb-5">{error}</div>
        )}

        {!loading && apps.length === 0 && !error && (
          <div className="bg-white rounded-xl border border-gray-100 p-14 text-center">
            <div className="text-5xl mb-4">📋</div>
            <div className="text-lg font-semibold text-gray-700 mb-2">Nog geen sollicitaties</div>
            <div className="text-gray-400 text-sm mb-6">Solliciteer op vacatures om ze hier te zien verschijnen.</div>
            <Link
              href="/vacatures"
              className="inline-block px-6 py-3 rounded-xl text-sm font-bold text-white no-underline hover:opacity-90"
              style={{ background: "#0DA89E" }}
            >
              Zoek vacatures
            </Link>
          </div>
        )}

        {!loading && apps.length > 0 && (
          <div className="space-y-3">
            {apps.map((app) => (
              <Link
                key={app.application_id}
                href={`/candidate/sollicitaties/${app.application_id}`}
                className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 px-5 py-4 no-underline hover:border-teal-100 hover:shadow-sm transition-all group"
              >
                <ScoreCircle score={app.match_score} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm group-hover:text-teal-700 transition-colors">
                    {app.vacancy_title}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {app.vacancy_location || "Locatie onbekend"} · {new Date(app.created_at).toLocaleDateString("nl-NL")}
                  </div>
                  {app.ai_summary && (
                    <div className="text-xs text-gray-400 mt-1 line-clamp-1">{app.ai_summary}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={app.status} />
                  <span className="text-gray-300 text-lg">›</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
