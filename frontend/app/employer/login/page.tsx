"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, me } from "@/lib/api";
import { setSession } from "@/lib/session";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://its-peanuts-backend.onrender.com";

export default function EmployerLoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regToken, setRegToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { access_token } = await login(loginEmail, loginPassword);
      const user = await me(access_token);
      if (user.role !== "employer") {
        setError("Dit account is geen werkgeversaccount. Gebruik het kandidatenportaal.");
        return;
      }
      setSession({ token: access_token, role: "employer", email: user.email });
      router.push("/employer");
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
      const res = await fetch(`${BASE}/auth/register-employer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          full_name: regName,
          bootstrap_token: regToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Registratie mislukt");
      const user = await me(data.access_token);
      setSession({ token: data.access_token, role: "employer", email: user.email });
      router.push("/employer");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registratie mislukt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 no-underline">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base" style={{ background: "#0DA89E" }}>
              P
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-900 text-lg leading-tight">It&apos;s Peanuts AI</div>
              <div className="text-xs text-gray-400">Werkgeversportaal</div>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            {tab === "login" ? "Werkgever inloggen" : "Werkgever registreren"}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {tab === "login" ? "Log in op uw werkgeversportaal" : "Maak een werkgeversaccount aan"}
          </p>

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6 gap-1">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
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
                <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="bedrijf@voorbeeld.nl"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Wachtwoord</label>
                <input type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity disabled:opacity-60"
                style={{ background: "#0DA89E" }}>
                {loading ? "Bezig..." : "Inloggen"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bedrijfsnaam / Naam</label>
                <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)}
                  placeholder="Bedrijf BV"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-mailadres</label>
                <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="bedrijf@voorbeeld.nl"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Wachtwoord</label>
                <input type="password" required minLength={8} value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimaal 8 tekens"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Bootstrap Token
                  <span className="ml-1 text-xs text-gray-400 font-normal">(ontvangen via It&apos;s Peanuts)</span>
                </label>
                <input type="text" required value={regToken} onChange={(e) => setRegToken(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity disabled:opacity-60"
                style={{ background: "#0DA89E" }}>
                {loading ? "Bezig..." : "Account aanmaken"}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Bent u kandidaat?{" "}
              <Link href="/candidate/login" className="text-teal-600 font-semibold no-underline hover:text-teal-700">
                Kandidatenportaal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
