"use client";

import { useLanguage } from "@/lib/i18n";

const LINK_URL =
  "https://vorzapdf.com/tools/pdf-to-word?utm_source=vorzaiq&utm_medium=referral&utm_campaign=cv-upload-tip";

const COPY = {
  nl: {
    default: "CV in PDF maar wil je 'm nog aanpassen?",
    defaultCta: "Zet 'm gratis om naar Word",
    compact: "PDF naar Word converteren?",
    compactCta: "Gratis bij VorzaPDF",
  },
  en: {
    default: "CV in PDF but want to make changes?",
    defaultCta: "Convert to Word for free",
    compact: "Convert PDF to Word?",
    compactCta: "Free at VorzaPDF",
  },
  de: {
    default: "Lebenslauf als PDF, aber noch bearbeiten?",
    defaultCta: "Kostenlos in Word umwandeln",
    compact: "PDF in Word umwandeln?",
    compactCta: "Kostenlos bei VorzaPDF",
  },
  fr: {
    default: "CV en PDF mais vous voulez le modifier ?",
    defaultCta: "Convertissez-le gratuitement en Word",
    compact: "Convertir un PDF en Word ?",
    compactCta: "Gratuit sur VorzaPDF",
  },
  es: {
    default: "CV en PDF pero quieres editarlo?",
    defaultCta: "Conviertelo a Word gratis",
    compact: "Convertir PDF a Word?",
    compactCta: "Gratis en VorzaPDF",
  },
};

function FileTextIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6366f1"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, marginLeft: 2 }}
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

interface Props {
  variant?: "default" | "compact";
}

export default function PdfToWordTip({ variant = "default" }: Props) {
  const { lang } = useLanguage();
  const t = COPY[lang] || COPY.nl;

  const text = variant === "compact" ? t.compact : t.default;
  const cta = variant === "compact" ? t.compactCta : t.defaultCta;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: "#EEF2FF",
        border: "1px solid #E0E7FF",
        borderRadius: 10,
        fontSize: 13,
        color: "#4B5563",
        marginTop: 14,
        flexWrap: "wrap",
      }}
    >
      <FileTextIcon />
      <span>
        {text}{" "}
        <a
          href={LINK_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open VorzaPDF in nieuw tabblad om CV om te zetten naar Word"
          style={{
            color: "#4F46E5",
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {cta} <ExternalLinkIcon />
        </a>
      </span>
    </div>
  );
}
