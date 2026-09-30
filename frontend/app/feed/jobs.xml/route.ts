import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://api.vorzaiq.com";
const SITE_URL = "https://www.vorzaiq.com";

type Vacancy = {
  id: number;
  title: string;
  location: string | null;
  description: string | null;
  salary_range: string | null;
  employment_type: string | null;
  hours_per_week: string | null;
  employer_name: string | null;
  created_at: string;
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

function mapJobType(et: string | null): string {
  const map: Record<string, string> = {
    fulltime: "full-time",
    parttime: "part-time",
    freelance: "contract",
    zzp: "contract",
    stage: "internship",
    tijdelijk: "temporary",
  };
  return map[et || ""] || "full-time";
}

export async function GET() {
  let vacancies: Vacancy[] = [];
  try {
    const res = await fetch(`${API_BASE}/vacancies?limit=500`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) vacancies = await res.json();
  } catch {
    // API unavailable
  }

  const jobs = vacancies
    .map(
      (v) => `  <job>
    <title><![CDATA[${v.title}]]></title>
    <date>${formatDate(v.created_at)}</date>
    <referencenumber>${v.id}</referencenumber>
    <url>${SITE_URL}/vacatures/${v.id}</url>
    <company><![CDATA[${v.employer_name || "VorzaIQ"}]]></company>
    <city><![CDATA[${v.location || "Nederland"}]]></city>
    <country>NL</country>
    <description><![CDATA[${v.description || v.title}]]></description>${v.salary_range ? `\n    <salary><![CDATA[${v.salary_range}]]></salary>` : ""}
    <jobtype>${mapJobType(v.employment_type)}</jobtype>
  </job>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher>VorzaIQ</publisher>
  <publisherurl>${SITE_URL}</publisherurl>
  <lastBuildDate>${new Date().toISOString()}</lastBuildDate>
${jobs}
</source>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
