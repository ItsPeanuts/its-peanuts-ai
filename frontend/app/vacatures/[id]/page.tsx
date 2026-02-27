"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getVacancy, PublicVacancyDetail } from "@/lib/api";

const AVATAR_COLORS = ["bg-teal-500", "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-green-500", "bg-indigo-500", "bg-red-500"];
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }
function getInitials(title: string) {
  return title.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default function VacatureDetailPage({ params }: { params: { id: string } }) {
  const [vacancy, setVacancy] = useState<PublicVacancyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getVacancy(parseInt(params.id))
      .then(setVacancy)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Vacature laden...</div>
      </div>
    );
  }

  if (error || !vacancy) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">😕</div>
          <p className="font-semibold text-gray-700 mb-4">{error || "Vacature niet gevonden"}</p>
          <Link href="/vacatures" className="text-sm font-semibold text-teal-600 no-underline">
            ← Terug naar overzicht
          </Link>
        </div>
      </div>
    );
  }

  const color = avatarColor(vacancy.id);
  const initials = getInitials(vacancy.title);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-teal-600 no-underline transition-colors">Home</Link>
          <span>/</span>
          <Link href="/vacatures" className="hover:text-teal-600 no-underline transition-colors">Vacatures</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{vacancy.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-7 items-start">

          {/* Hoofdcontent */}
          <div className="col-span-2 space-y-5">
            {/* Job header card */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex gap-5 items-start">
                <div className={`${color} w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}>
                  {initials}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 leading-tight">{vacancy.title}</h1>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                    {vacancy.location && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {vacancy.location}
                      </span>
                    )}
                    {vacancy.hours_per_week && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {vacancy.hours_per_week} uur/week
                      </span>
                    )}
                    {vacancy.salary_range && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {vacancy.salary_range}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 font-medium">AI-matching</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">Direct solliciteren</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Beschrijving */}
            {vacancy.description && (
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4">Functieomschrijving</h2>
                <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {vacancy.description}
                </div>
              </div>
            )}

            {/* Screeningsvragen */}
            {vacancy.intake_questions.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-base font-bold text-gray-900 mb-2">Screeningsvragen</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Bij je sollicitatie word je gevraagd deze vragen te beantwoorden.
                </p>
                <ul className="space-y-2">
                  {vacancy.intake_questions.map((q) => (
                    <li key={q.id} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">?</span>
                      {q.question}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside>
            <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-1">Solliciteer nu</h3>
              <p className="text-xs text-gray-500 mb-4">AI pre-screening in 2 minuten</p>

              <Link
                href={`/vacatures/${vacancy.id}/solliciteer`}
                className="block w-full text-center py-3 px-4 rounded-xl text-sm font-bold text-white no-underline transition-all mb-3"
                style={{ background: "#f97316" }}
              >
                🚀 Apply Now
              </Link>

              <Link
                href="/candidate/login"
                className="block w-full text-center py-3 px-4 rounded-xl text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 no-underline transition-colors"
              >
                Inloggen voor AI-match
              </Link>

              {/* Job details */}
              <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
                {vacancy.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Locatie</div>
                      <div className="font-medium text-gray-700">{vacancy.location}</div>
                    </div>
                  </div>
                )}
                {vacancy.hours_per_week && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Uren per week</div>
                      <div className="font-medium text-gray-700">{vacancy.hours_per_week} uur</div>
                    </div>
                  </div>
                )}
                {vacancy.salary_range && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Salaris</div>
                      <div className="font-medium text-gray-700">{vacancy.salary_range}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
