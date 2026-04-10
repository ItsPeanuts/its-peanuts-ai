"use client";

import { useEffect } from "react";
import { useLanguage } from "@/lib/i18n";

/**
 * Synchroniseert het `lang` attribuut op <html> met de actieve taal.
 * Injecteer in RootLayout zodat screen readers en SEO de juiste taal zien.
 */
export default function HtmlLangSync() {
  const { lang } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}
