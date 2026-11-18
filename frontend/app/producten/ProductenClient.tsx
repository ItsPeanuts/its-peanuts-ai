"use client";

import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import { useLanguage } from "@/lib/i18n";

export default function ProductenClient() {
  const { T } = useLanguage();
  const p = T.products;

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <section className="bg-white border-b border-gray-100 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{p.title}</h1>
          <p className="text-gray-500 text-base leading-relaxed">{p.intro}</p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* VorzaIQ */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col">
            <div className="h-12 flex items-center mb-5">
              <img src="/vorzaiq-logo.svg" alt="VorzaIQ" className="h-8" />
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {p.vorzaiq.text}
            </p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {p.forWho}
            </p>
            <p className="text-sm text-gray-600 mb-6">{p.vorzaiq.audience}</p>
            <div className="mt-auto">
              <Link
                href="/"
                className="inline-block w-full text-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors no-underline"
              >
                {p.viewPlatform}
              </Link>
            </div>
          </div>

          {/* LisaRecruit */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col">
            <div className="h-12 flex items-center mb-5">
              <img
                src="/brand/lisarecruit-logo.svg"
                alt="LisaRecruit"
                className="h-8"
              />
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {p.lisarecruit.text}
            </p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {p.forWho}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              {p.lisarecruit.audience}
            </p>
            <p className="text-sm font-medium text-purple-600 mb-6">
              {p.lisarecruit.trial}
            </p>
            <div className="mt-auto">
              <a
                href="https://www.lisarecruit.com"
                target="_blank"
                rel="noopener"
                className="inline-block w-full text-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors no-underline"
              >
                {p.toLisaRecruit}
              </a>
            </div>
          </div>

          {/* VorzaPDF */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col">
            <div className="h-12 flex items-center mb-5">
              <span className="text-xl font-bold text-gray-900">VorzaPDF</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {p.vorzapdf.text}
            </p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {p.forWho}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              {p.vorzapdf.audience}
            </p>
            <p className="text-sm font-medium text-purple-600 mb-6">
              {p.vorzapdf.free}
            </p>
            <div className="mt-auto">
              <a
                href="https://www.vorzapdf.com"
                target="_blank"
                rel="noopener"
                className="inline-block w-full text-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors no-underline"
              >
                {p.toVorzaPDF}
              </a>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
