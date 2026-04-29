"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login, me, createCheckoutSession } from "@/lib/api";
import { setSession } from "@/lib/session";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://its-peanuts-backend.onrender.com";

function EmployerLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"login" | "register">("login");

  const [launchRedirecting, setLaunchRedirecting] = useState(false);
  const [isLaunch, setIsLaunch] = useState(false);

  useEffect(() => {
    if (searchParams?.get("tab") === "register") setTab("register");

    // Launch promo: ?launch=VORZAIQ-LAUNCH → sla coupon op, switch naar register
    const launchCode = searchParams?.get("launch");
    if (launchCode) {
      localStorage.setItem("vorzaiq_launch_coupon", "7bzV8eqk");
      setTab("register");
      setIsLaunch(true);
    } else if (typeof window !== "undefined" && localStorage.getItem("vorzaiq_launch_coupon")) {
      setIsLaunch(true);
    }
  }, [searchParams]);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkEmail, setCheckEmail] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { access_token } = await login(loginEmail, loginPassword);
      const user = await me(access_token);
      const role = user.role as "candidate" | "employer" | "admin";
      if (role === "candidate") {
        setError("Dit account is een kandidaatsaccount. Gebruik het kandidatenportaal.");
        return;
      }
      setSession({ token: access_token, role, email: user.email });

      // Launch promo: als coupon in localStorage staat, redirect naar Stripe checkout
      const launchCoupon = localStorage.getItem("vorzaiq_launch_coupon");
      if (launchCoupon && role === "employer") {
        try {
          setLaunchRedirecting(true);
          const { checkout_url } = await createCheckoutSession(access_token, "premium", "month", launchCoupon);
          localStorage.removeItem("vorzaiq_launch_coupon");
          window.location.href = checkout_url;
          return;
        } catch {
          // Checkout mislukt — verwijder coupon, ga gewoon door naar dashboard
          localStorage.removeItem("vorzaiq_launch_coupon");
        }
      }

      if (role === "admin") router.push("/admin");
      else router.push("/employer");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Inloggen mislukt";
      if (msg.includes("EMAIL_NOT_VERIFIED")) {
        setError("Bevestig eerst je e-mailadres via de link die we hebben gestuurd.");
      } else {
        setError(msg);
      }
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Registratie mislukt");
      // Toon "check je e-mail" scherm — werkgever moet eerst e-mail bevestigen
      setCheckEmail(regEmail);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registratie mislukt");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!checkEmail) return;
    await fetch(`${BASE}/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: checkEmail }),
    });
  }

  if (launchRedirecting) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Even geduld...</h1>
            <p className="text-sm text-gray-500">Je wordt doorgestuurd naar de betaalpagina om je Scale abonnement te activeren.</p>
          </div>
        </div>
      </div>
    );
  }

  if (checkEmail) {
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
                <div className="text-xs text-gray-400">Werkgeversportaal</div>
              </div>
            </Link>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl" style={{ background: "#F3E8FF" }}>
              ✉
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Check je e-mail</h1>
            <p className="text-sm text-gray-500 mb-1">We hebben een verificatielink gestuurd naar:</p>
            <p className="text-sm font-semibold text-gray-800 mb-6">{checkEmail}</p>
            <p className="text-sm text-gray-400 mb-6">
              Klik op de link in de e-mail om je account te activeren.
              {isLaunch ? " Daarna log je in en word je doorgestuurd om je gratis Scale abonnement te activeren." : " Daarna kun je inloggen."}
            </p>
            <button
              onClick={handleResend}
              className="text-sm text-purple-600 font-semibold hover:text-purple-700 underline"
            >
              E-mail opnieuw versturen
            </button>
            <div className="mt-4">
              <button
                onClick={() => { setCheckEmail(""); setTab("login"); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Terug naar inloggen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Wachtwoord</label>
                <input type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity disabled:opacity-60"
                style={{ background: "#7C3AED" }}>
                {loading ? "Bezig..." : "Inloggen"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {isLaunch ? (
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-purple-800 text-sm font-medium">
                  <span className="text-purple-600 font-bold text-base">★</span>
                  Scale abonnement — 6 maanden gratis
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-800 text-sm font-medium">
                  <span className="text-green-600 font-bold text-base">✓</span>
                  Eerste maand gratis — geen creditcard nodig
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bedrijfsnaam / Naam</label>
                <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)}
                  placeholder="Bedrijf BV"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-mailadres</label>
                <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="bedrijf@voorbeeld.nl"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Wachtwoord</label>
                <input type="password" required minLength={8} value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimaal 8 tekens"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity disabled:opacity-60"
                style={{ background: "#7C3AED" }}>
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
              Bent u kandidaat?{" "}
              <Link href="/candidate/login" className="text-purple-600 font-semibold no-underline hover:text-purple-700">
                Kandidatenportaal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmployerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400 text-sm">Laden...</div></div>}>
      <EmployerLoginContent />
    </Suspense>
  );
}
