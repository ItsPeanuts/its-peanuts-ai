"use client";

import Link from "next/link";

export default function PromotieGeannuleerdPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 overflow-x-hidden">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-10 text-center">
        <div className="text-5xl mb-5">↩️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Betaling geannuleerd</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Je betaling is niet voltooid. Er zijn geen kosten in rekening gebracht.
          Je kunt het opnieuw proberen via het dashboard.
        </p>
        <Link
          href="/employer"
          className="inline-block px-8 py-3 rounded-xl text-sm font-bold text-white no-underline hover:opacity-90 transition"
          style={{ background: "#7C3AED" }}
        >
          Terug naar dashboard
        </Link>
      </div>
    </div>
  );
}
