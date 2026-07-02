"use client";

import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import { useLanguage } from "@/lib/i18n";

export default function VoorwaardenPage() {
  const { T } = useLanguage();
  const { title, lastUpdated, sections } = T.terms;

  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh" }}>
      <PublicNav />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
          {title}
        </h1>
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 40 }}>
          {lastUpdated}
        </p>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "32px", display: "flex", flexDirection: "column", gap: 32 }}>
          {sections.map((section, i) => (
            <div key={i}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 10 }}>
                {section.title}
              </h2>
              <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
                {section.content && section.content.split("\n").map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < section.content.split("\n").length - 1 && <br />}
                  </span>
                ))}
                {section.items && (
                  <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                    {section.items.map((item, k) => (
                      <li key={k} style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
