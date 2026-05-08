"use client";

import { useLanguage } from "@/lib/i18n";

const LINK_URL =
  "https://vorzapdf.com/tools/pdf-to-word?utm_source=vorzaiq&utm_medium=referral&utm_campaign=cv-upload-tip";

const COPY = {
  nl: {
    title: "CV in PDF, maar nog even aanpassen?",
    body: "Zet je CV gratis om naar Word, bewerk het, en upload de nieuwe versie.",
    cta: "Open VorzaPDF",
  },
  en: {
    title: "CV in PDF but need to make changes?",
    body: "Convert your CV to Word for free, edit it, and upload the new version.",
    cta: "Open VorzaPDF",
  },
  de: {
    title: "Lebenslauf als PDF, aber noch bearbeiten?",
    body: "Wandle deinen Lebenslauf kostenlos in Word um, bearbeite ihn und lade die neue Version hoch.",
    cta: "VorzaPDF offnen",
  },
  fr: {
    title: "CV en PDF, mais vous voulez le modifier ?",
    body: "Convertissez votre CV en Word gratuitement, modifiez-le et uploadez la nouvelle version.",
    cta: "Ouvrir VorzaPDF",
  },
  es: {
    title: "CV en PDF, pero quieres editarlo?",
    body: "Convierte tu CV a Word gratis, editalo y sube la nueva version.",
    cta: "Abrir VorzaPDF",
  },
};

function FileEditIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#4F46E5"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default function PdfToWordTip() {
  const { lang } = useLanguage();
  const t = COPY[lang] || COPY.nl;

  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: 16,
        background: "#EEF2FF",
        border: "1px solid #C7D2FE",
        borderRadius: 14,
        marginTop: 16,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "#E0E7FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <FileEditIcon />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#1E1B4B",
            margin: "0 0 4px",
          }}
        >
          {t.title}
        </p>
        <p
          style={{
            fontSize: 13,
            color: "#4B5563",
            margin: "0 0 10px",
            lineHeight: 1.5,
          }}
        >
          {t.body}
        </p>
        <a
          href={LINK_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open VorzaPDF in nieuw tabblad om CV om te zetten naar Word"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: "#4F46E5",
            background: "transparent",
            border: "1.5px solid #4F46E5",
            borderRadius: 8,
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          {t.cta} <ExternalLinkIcon />
        </a>
      </div>
    </div>
  );
}
