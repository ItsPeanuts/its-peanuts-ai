"use client";

import Link from "next/link";

export default function PromotieSucesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-10 text-center">
        <div className="text-5xl mb-5">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Betaling geslaagd!</h1>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Je vacature wordt binnenkort gepromoot op alle platforms:
        </p>
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {["Facebook", "Instagram", "Google", "TikTok", "LinkedIn"].map((p) => (
            <span
              key={p}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-100"
            >
              {p}
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-500 mb-8">
          Je ontvangt een bevestiging per e-mail. Onze campagne-specialist zal binnen
          1 werkdag de advertenties activeren.
        </p>
        <Link
          href="/employer"
          className="inline-block px-8 py-3 rounded-xl text-sm font-bold text-white no-underline hover:opacity-90 transition"
          style={{ background: "#f97316" }}
        >
          Terug naar dashboard
        </Link>
      </div>
    </div>
  );
}
