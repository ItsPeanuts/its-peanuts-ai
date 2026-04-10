"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, Lang, TranslationSet } from "./translations";

type LanguageContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  T: TranslationSet;
};

const VALID_LANGS: Lang[] = ["nl", "en", "de", "fr", "es"];

// Country → taal mapping
const COUNTRY_LANG: Record<string, Lang> = {
  NL: "nl", BE: "nl",
  GB: "en", IE: "en", AU: "en", NZ: "en", CA: "en", US: "en", ZA: "en",
  DE: "de", AT: "de", CH: "de",
  FR: "fr",
  ES: "es", PT: "es", MX: "es", AR: "es", CO: "es",
};

function isValidLang(l: string | null): l is Lang {
  return !!l && (VALID_LANGS as string[]).includes(l);
}

async function detectLangFromIP(): Promise<Lang | null> {
  const cached = sessionStorage.getItem("ip_lang");
  if (isValidLang(cached)) return cached;

  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    const country: string = (data?.country_code ?? "").toUpperCase();
    const detected = COUNTRY_LANG[country] ?? null;
    if (detected) sessionStorage.setItem("ip_lang", detected);
    return detected;
  } catch {
    return null;
  }
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "nl",
  setLang: () => {},
  T: translations.nl,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("nl");

  useEffect(() => {
    async function init() {
      // 1. ?lang=XX URL param (hoogste prioriteit)
      const urlParam = new URLSearchParams(window.location.search).get("lang");
      if (isValidLang(urlParam)) {
        setLangState(urlParam);
        localStorage.setItem("lang", urlParam);
        return;
      }

      // 2. Opgeslagen voorkeur uit localStorage
      const stored = localStorage.getItem("lang");
      if (isValidLang(stored)) {
        setLangState(stored);
        return;
      }

      // 3. IP-detectie (geen opgeslagen voorkeur)
      const ipLang = await detectLangFromIP();
      if (ipLang) {
        setLangState(ipLang);
        return;
      }

      // 4. Browser voorkeurstaal als fallback
      const browserLang = navigator.language?.slice(0, 2).toLowerCase();
      if (isValidLang(browserLang)) {
        setLangState(browserLang);
      }
    }

    init();
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, T: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
