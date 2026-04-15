"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { Lang } from "@/lib/translations";

export default function PublicNav() {
  const [open, setOpen] = useState(false);
  const { lang, setLang, T } = useLanguage();

  const otherLang: Lang = lang === "nl" ? "en" : "nl";
  const otherLabel = lang === "nl" ? "EN" : "NL";

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center no-underline group">
          <img src="/vorzaiq-logo.svg" alt="VorzaIQ" className="h-9" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/vacatures" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-primary hover:bg-primary-50 transition-colors no-underline">
            {T.nav.vacancies}
          </Link>
          <Link href="/candidate" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-primary hover:bg-primary-50 transition-colors no-underline">
            {T.nav.candidates}
          </Link>
          <Link href="/abonnementen" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-primary hover:bg-primary-50 transition-colors no-underline">
            {T.nav.employers}
          </Link>
          <button
            onClick={() => setLang(otherLang)}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors border border-gray-200"
            title={lang === "nl" ? "Switch to English" : "Schakel naar Nederlands"}
          >
            {otherLabel}
          </button>
          <Link href="/candidate/login" className="ml-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-600 transition-colors no-underline">
            {T.nav.login}
          </Link>
        </nav>

        {/* Hamburger (mobiel) */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden flex flex-col justify-center items-center gap-1.5 p-2 rounded-lg hover:bg-gray-50"
          aria-label="Menu openen"
        >
          <span className={`block w-6 h-0.5 bg-gray-600 transition-all duration-200 ${open ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-6 h-0.5 bg-gray-600 transition-all duration-200 ${open ? "opacity-0" : ""}`} />
          <span className={`block w-6 h-0.5 bg-gray-600 transition-all duration-200 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobiel menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-1 shadow-lg">
          <Link
            href="/vacatures"
            onClick={() => setOpen(false)}
            className="px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 no-underline block"
          >
            {T.nav.vacancies}
          </Link>
          <Link
            href="/candidate"
            onClick={() => setOpen(false)}
            className="px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 no-underline block"
          >
            {T.nav.candidates}
          </Link>
          <Link
            href="/abonnementen"
            onClick={() => setOpen(false)}
            className="px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 no-underline block"
          >
            {T.nav.employers}
          </Link>
          <button
            onClick={() => { setLang(otherLang); setOpen(false); }}
            className="px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 text-left"
          >
            {lang === "nl" ? "Switch to English" : "Schakel naar Nederlands"}
          </button>
          <Link
            href="/candidate/login"
            onClick={() => setOpen(false)}
            className="mt-2 px-4 py-3 rounded-lg text-sm font-semibold text-white bg-primary text-center no-underline block"
          >
            {T.nav.login}
          </Link>
        </div>
      )}
    </header>
  );
}
