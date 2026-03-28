"use client";

import { useState } from "react";
import Link from "next/link";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://its-peanuts-backend.onrender.com";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.detail || "Er ging iets mis");
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 no-underline">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base"
              style={{ background: "#7C3AED" }}
            >
              V
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-900 text-lg leading-tight">VorzaIQ</div>
              <div className="text-xs text-gray-400">Wachtwoord vergeten</div>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {sent ? (
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
                style={{ background: "#F3E8FF" }}
              >
                ✉
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Check je e-mail</h1>
              <p className="text-sm text-gray-500 mb-6">
                Als er een account bestaat voor <strong>{email}</strong>, ontvang je binnen enkele minuten een reset-link.
              </p>
              <p className="text-xs text-gray-400 mb-6">
                Geen e-mail ontvangen? Check ook je spamfolder.
              </p>
              <Link
                href="/employer/login"
                className="block w-full py-3 rounded-xl text-center text-sm font-semibold text-purple-600 hover:text-purple-700 no-underline"
              >
                Terug naar inloggen
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Wachtwoord vergeten?</h1>
              <p className="text-sm text-gray-500 mb-6">
                Vul je e-mailadres in en we sturen je een link om je wachtwoord te resetten.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mb-5">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    E-mailadres
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jouw@email.nl"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity disabled:opacity-60"
                  style={{ background: "#7C3AED" }}
                >
                  {loading ? "Bezig..." : "Reset-link versturen"}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <Link
                  href="/employer/login"
                  className="text-sm text-gray-500 hover:text-gray-700 no-underline"
                >
                  ← Terug naar inloggen
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
