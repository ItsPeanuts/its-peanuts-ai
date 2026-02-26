import Link from "next/link";
import { PublicVacancy } from "@/lib/api";

interface Props {
  vacancy: PublicVacancy;
}

export default function VacancyCard({ vacancy }: Props) {
  const preview = vacancy.description
    ? vacancy.description.slice(0, 130) +
      (vacancy.description.length > 130 ? "..." : "")
    : "";

  return (
    <div className="job-card">
      <div className="job-header">
        <div style={{ flex: 1 }}>
          <h3 className="job-title">{vacancy.title}</h3>
          <div className="job-meta">
            {vacancy.location && <span>📍 {vacancy.location}</span>}
            {vacancy.hours_per_week && <span>🕐 {vacancy.hours_per_week}</span>}
            {vacancy.salary_range && <span>💰 {vacancy.salary_range}</span>}
          </div>
        </div>
        <div className="job-match">
          <Link
            href={`/vacatures/${vacancy.id}`}
            className="btn btn-primary"
            style={{ whiteSpace: "nowrap" }}
          >
            Bekijk →
          </Link>
        </div>
      </div>
      {preview && (
        <p
          style={{
            color: "var(--text-secondary)",
            marginTop: "10px",
            fontSize: "0.9rem",
            lineHeight: "1.5",
          }}
        >
          {preview}
        </p>
      )}
    </div>
  );
}
