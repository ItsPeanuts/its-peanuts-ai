"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { setSession } from "@/lib/session";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://its-peanuts-backend.onrender.com";

interface ClaimInfo {
  vacancy_title: string;
  company_name: string | null;
  status: string;
}

export default function ClaimPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [loadError, setLoadError] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Haal vacature-info op
  useEffect(() => {
    if (!token) return;
    fetch(`${BASE}/claim/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Ongeldige link");
        setInfo(data);
        if (data.company_name) setCompanyName(data.company_name);
      })
      .catch((err) => setLoadError(err.message));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Wachtwoord moet minimaal 8 tekens bevatten.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/claim/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: companyName, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Activatie mislukt");

      // Haal email op en sla sessie op
      const meRes = await fetch(`${BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const meData = await meRes.json();
      setSession({ token: data.access_token, role: "employer", email: meData.email || "" });
      router.push("/employer");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setSubmitting(false);
    }
  }

  // Laden
  if (!info && !loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Laden…</div>
      </div>
    );
  }

  // Fout
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ongeldige link</h1>
          <p className="text-gray-500">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 overflow-x-hidden">
      <div className="max-w-md w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-black">V</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">VorzaIQ</h1>
          <p className="text-gray-500 mt-1">The Smart Way to Hire</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Groene banner */}
          <div className="bg-purple-600 px-8 py-6">
            <div className="text-white text-lg font-bold">🎉 Goed nieuws!</div>
            <div className="text-purple-100 text-sm mt-1">
              Iemand heeft gesolliciteerd op uw vacature
            </div>
          </div>

          <div className="px-8 py-6">
            {/* Vacature info */}
            <div className="bg-purple-50 border border-purple-100 rounded-xl px-5 py-4 mb-6">
              <div className="text-xs text-purple-700 font-semibold uppercase tracking-wide mb-1">
                Vacature
              </div>
              <div className="text-lg font-bold text-gray-900">{info!.vacancy_title}</div>
              {info!.company_name && (
                <div className="text-sm text-gray-500 mt-1">{info!.company_name}</div>
              )}
            </div>

            {/* Uitleg */}
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              VorzaIQ heeft uw vacature gevonden en gratis op ons platform gepubliceerd.
              Activeer uw gratis account om de sollicitant te bekijken en te reageren.
              <br />
              <span className="font-semibold text-gray-800">Geen creditcard vereist.</span>
            </p>

            {/* Formulier */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bedrijfsnaam
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  placeholder="Uw bedrijfsnaam"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kies een wachtwoord
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Minimaal 8 tekens"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-60"
              >
                {submitting ? "Bezig…" : "Activeer gratis account en bekijk sollicitant →"}
              </button>
            </form>

            <hr className="my-6 border-gray-100" />

            {/* Disclaimer */}
            <p className="text-xs text-gray-400 leading-relaxed">
              U ontvangt deze mail omdat iemand heeft gesolliciteerd op een vacature die door
              VorzaIQ is gevonden op internet. Uw eerste vacature is altijd gratis. Meerdere
              vacatures plaatsen? Upgrade uw abonnement vanuit het dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
