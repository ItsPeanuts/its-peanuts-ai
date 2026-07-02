"use client";

import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import { useLanguage } from "@/lib/i18n";

export default function PrivacyPage() {
  const { lang, T } = useLanguage();
  const { title, lastUpdated, sections, dataTable } = T.privacy;

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

                {/* Data table for section 4 (purposes/bases) */}
                {section.title.includes("4") && dataTable && dataTable.length > 0 && (
                  <div style={{ overflowX: "auto", marginTop: 8, marginBottom: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                          <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 700, color: "#111827" }}>
                            {lang === "nl" ? "Doel" : lang === "de" ? "Zweck" : lang === "fr" ? "Objectif" : "Purpose"}
                          </th>
                          <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 700, color: "#111827" }}>
                            {lang === "nl" ? "Grondslag" : lang === "de" ? "Rechtsgrundlage" : lang === "fr" ? "Base juridique" : "Legal basis"}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataTable.map((row, r) => (
                          <tr key={r} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "8px 12px", color: "#374151" }}>{row.purpose}</td>
                            <td style={{ padding: "8px 12px", color: "#6b7280" }}>{row.basis}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

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
