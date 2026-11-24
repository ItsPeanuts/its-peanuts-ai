import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import { JsonLd } from "@/components/JsonLd";
import { markdownToHtml } from "@/lib/markdown";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://api.vorzaiq.com";

type Vacancy = {
  id: number;
  title: string;
  location: string | null;
  hours_per_week: string | null;
  salary_range: string | null;
  description: string | null;
  employment_type: string | null;
  work_location: string | null;
  language: string | null;
  created_at: string;
  employer_name: string | null;
  employer_logo: string | null;
  interview_type: string;
  employer_plan: string;
  intake_questions: { id: number; qtype: string; question: string; options_json: string | null }[];
};

async function fetchVacancy(id: string): Promise<Vacancy | null> {
  try {
    const res = await fetch(`${API_BASE}/vacancies/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const vacancy = await fetchVacancy(params.id);

  if (!vacancy) {
    return {
      title: "Vacature niet gevonden",
      description: "Bekijk deze vacature op VorzaIQ en solliciteer direct.",
    };
  }

  const city = vacancy.location || "Nederland";
  const title = `${vacancy.title} in ${city}`;
  const description = `Bekijk de vacature voor ${vacancy.title} in ${city}. Solliciteer direct en word gescreend door Lisa, onze AI-recruiter.`;
  const url = `https://www.vorzaiq.com/vacatures/${params.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | VorzaIQ`,
      description,
      url,
      type: "article",
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      images: ["/opengraph-image.png"],
    },
  };
}

const AVATAR_COLORS = [
  "bg-purple-500", "bg-blue-500", "bg-purple-500", "bg-pink-500",
  "bg-orange-500", "bg-green-500", "bg-indigo-500", "bg-red-500",
];

function buildJobPostingJsonLd(vacancy: Vacancy) {
  const datePosted = vacancy.created_at?.split("T")[0] || new Date().toISOString().split("T")[0];
  const validDate = new Date(datePosted);
  validDate.setDate(validDate.getDate() + 60);
  const validThrough = validDate.toISOString().split("T")[0];

  const typeMap: Record<string, string> = {
    fulltime: "FULL_TIME",
    parttime: "PART_TIME",
    freelance: "CONTRACTOR",
    zzp: "CONTRACTOR",
    stage: "INTERN",
    tijdelijk: "TEMPORARY",
  };
  const employmentType = typeMap[vacancy.employment_type || ""] || "FULL_TIME";

  let baseSalary = undefined;
  if (vacancy.salary_range) {
    const nums = vacancy.salary_range.match(/[\d.]+/g);
    if (nums && nums.length > 0) {
      const val = parseFloat(nums[0].replace(".", ""));
      if (val > 0) {
        baseSalary = {
          "@type": "MonetaryAmount",
          currency: "EUR",
          value: { "@type": "QuantitativeValue", value: val, unitText: "MONTH" },
        };
      }
    }
  }

  return {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: vacancy.title,
    description: vacancy.description || vacancy.title,
    datePosted,
    validThrough,
    employmentType,
    hiringOrganization: {
      "@type": "Organization",
      name: vacancy.employer_name || "VorzaIQ",
      sameAs: "https://www.vorzaiq.com",
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: vacancy.location || "Nederland",
        addressCountry: "NL",
      },
    },
    ...(baseSalary ? { baseSalary } : {}),
  };
}

export default async function VacatureDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const vacancy = await fetchVacancy(params.id);

  if (!vacancy) {
    notFound();
  }

  const color = AVATAR_COLORS[vacancy.id % AVATAR_COLORS.length];
  const initials = vacancy.title
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const descriptionHtml = vacancy.description
    ? markdownToHtml(vacancy.description)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <JsonLd data={buildJobPostingJsonLd(vacancy)} />
      <PublicNav />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-purple-600 no-underline transition-colors">Home</Link>
          <span>/</span>
          <Link href="/vacatures" className="hover:text-purple-600 no-underline transition-colors">Vacatures</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{vacancy.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-7 items-start">
          {/* Hoofdcontent */}
          <div className="col-span-1 md:col-span-2 space-y-5">
            {/* Job header card */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex gap-5 items-start">
                {vacancy.employer_logo ? (
                  <img src={vacancy.employer_logo} alt={vacancy.employer_name || ""} className="w-16 h-16 rounded-2xl object-contain flex-shrink-0 bg-gray-50 border border-gray-100" />
                ) : (
                  <div className={`${color} w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}>
                    {initials}
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 leading-tight">{vacancy.title}</h1>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                    {vacancy.location && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                        {vacancy.location}
                      </span>
                    )}
                    {vacancy.hours_per_week && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {vacancy.hours_per_week} uur/week
                      </span>
                    )}
                    {vacancy.salary_range && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {vacancy.salary_range}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-medium">AI-matching</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">Direct solliciteren</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Beschrijving */}
            {descriptionHtml && (
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4">Functieomschrijving</h2>
                <div
                  className="vacancy-description"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
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
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">?</span>
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
                className="block w-full text-center py-3 px-4 rounded-xl text-sm font-bold text-white no-underline transition-all mb-3 hover:opacity-90 bg-purple-600"
              >
                Nu solliciteren
              </Link>

              <Link
                href="/candidate/login"
                className="block w-full text-center py-3 px-4 rounded-xl text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 no-underline transition-colors"
              >
                Inloggen voor AI-match
              </Link>

              {/* Job details */}
              <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
                {vacancy.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
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
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
      <PublicFooter />
    </div>
  );
}
