"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://its-peanuts-backend.onrender.com";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Wachtwoorden komen niet overeen.");
      return;
    }
    if (!token) {
      setError("Geen reset-token gevonden. Vraag een nieuwe link aan.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Resetten mislukt");
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 text-2xl">✗</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Ongeldige link</h1>
        <p className="text-sm text-gray-500 mb-6">Geen reset-token gevonden. Vraag een nieuwe link aan.</p>
        <Link href="/forgot-password" className="block w-full py-3 rounded-xl text-white font-bold text-sm text-center no-underline" style={{ background: "#7C3AED" }}>
          Nieuwe link aanvragen
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl" style={{ background: "#F3E8FF" }}>✓</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Wachtwoord gewijzigd!</h1>
        <p className="text-sm text-gray-500 mb-6">Je kunt nu inloggen met je nieuwe wachtwoord.</p>
        <button
          onClick={() => router.push("/employer/login")}
          className="w-full py-3 rounded-xl text-white font-bold text-sm"
          style={{ background: "#7C3AED" }}
        >
          Inloggen
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Nieuw wachtwoord instellen</h1>
      <p className="text-sm text-gray-500 mb-6">Kies een sterk wachtwoord van minimaal 8 tekens.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mb-5">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nieuw wachtwoord</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimaal 8 tekens"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bevestig wachtwoord</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Herhaal je wachtwoord"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity disabled:opacity-60"
          style={{ background: "#7C3AED" }}
        >
          {loading ? "Bezig..." : "Wachtwoord opslaan"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 no-underline">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base" style={{ background: "#7C3AED" }}>
              V
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-900 text-lg leading-tight">VorzaIQ</div>
              <div className="text-xs text-gray-400">Wachtwoord resetten</div>
            </div>
          </Link>
        </div>
        <Suspense
          fallback={
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin mx-auto" />
            </div>
          }
        >
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}
