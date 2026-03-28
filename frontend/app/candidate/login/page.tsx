"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login, register, me } from "@/lib/api";
import { setSession } from "@/lib/session";

function CandidateLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || null;
  const initialTab = (searchParams.get("tab") as "login" | "register") || "login";
  const [tab, setTab] = useState<"login" | "register">(initialTab);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { access_token } = await login(loginEmail, loginPassword);
      const user = await me(access_token);
      const role = user.role as "candidate" | "employer" | "admin";
      setSession({ token: access_token, role, email: user.email });
      if (role === "admin") router.push(nextUrl || "/admin");
      else if (role === "employer") router.push(nextUrl || "/employer");
      else router.push(nextUrl || "/candidate");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Inloggen mislukt");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { access_token } = await register(regEmail, regPassword, regName);
      const user = await me(access_token);
      setSession({ token: access_token, role: "candidate", email: user.email });
      router.push(nextUrl || "/candidate/cv?next=/candidate");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registratie mislukt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 overflow-x-hidden">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 no-underline">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base" style={{ background: "#7C3AED" }}>
              V
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-900 text-lg leading-tight">VorzaIQ</div>
              <div className="text-xs text-gray-400">Find smarter. Hire faster.</div>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            {tab === "login" ? "Inloggen" : "Account aanmaken"}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {tab === "login" ? "Log in op je kandidatenportaal" : "Maak gratis een account aan"}
          </p>

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6 gap-1">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === t
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "login" ? "Inloggen" : "Registreren"}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mb-5">
              {error}
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-mailadres</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="naam@voorbeeld.nl"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Wachtwoord</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity disabled:opacity-60"
                style={{ background: "#7C3AED" }}
              >
                {loading ? "Bezig..." : "Inloggen"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Volledige naam</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Voornaam Achternaam"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-mailadres</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="naam@voorbeeld.nl"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Wachtwoord</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimaal 8 tekens"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity disabled:opacity-60"
                style={{ background: "#7C3AED" }}
              >
                {loading ? "Bezig..." : "Account aanmaken"}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-2">
            {tab === "login" && (
              <p className="text-sm text-gray-500">
                <Link href="/forgot-password" className="text-purple-600 font-semibold no-underline hover:text-purple-700">
                  Wachtwoord vergeten?
                </Link>
              </p>
            )}
            <p className="text-sm text-gray-500">
              Geen account nodig?{" "}
              <Link href="/vacatures" className="text-purple-600 font-semibold no-underline hover:text-purple-700">
                Bekijk vacatures
              </Link>
            </p>
          </div>
        </div>

        {/* Employer link */}
        <div className="text-center mt-4">
          <p className="text-sm text-gray-400">
            Bent u werkgever?{" "}
            <Link href="/employer" className="text-purple-600 font-semibold no-underline hover:text-purple-700">
              Werkgeversportaal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CandidateLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center overflow-x-hidden"><div className="text-sm text-gray-400">Laden...</div></div>}>
      <CandidateLoginContent />
    </Suspense>
  );
}
