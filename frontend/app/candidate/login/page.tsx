"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register, me } from "@/lib/api";
import { setSession } from "@/lib/session";

export default function CandidateLoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
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
      if (user.role !== "candidate") {
        setError("Dit account is geen kandidaat-account.");
        return;
      }
      setSession({ token: access_token, role: "candidate", email: user.email });
      router.push("/candidate");
    } catch (err: any) {
      setError(err?.message || "Inloggen mislukt");
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
      router.push("/candidate");
    } catch (err: any) {
      setError(err?.message || "Registratie mislukt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f0f4ff 0%, #e8f5e9 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: 16,
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
        padding: "40px 36px",
        width: "100%",
        maxWidth: 420,
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#0A66C2", letterSpacing: -1 }}>
            ItsPeanuts AI
          </div>
          <div style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
            Kandidatenportaal
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: "flex",
          background: "#f4f6fb",
          borderRadius: 12,
          padding: 4,
          marginBottom: 28,
          gap: 4,
        }}>
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              style={{
                flex: 1,
                padding: "10px 0",
                border: "none",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                background: tab === t ? "#fff" : "transparent",
                color: tab === t ? "#0A66C2" : "#666",
                boxShadow: tab === t ? "0 1px 6px rgba(0,0,0,0.10)" : "none",
                transition: "all 0.15s",
              }}
            >
              {t === "login" ? "Inloggen" : "Registreren"}
            </button>
          ))}
        </div>

        {error && (
          <div style={{
            background: "#fff0f0",
            border: "1px solid #fca5a5",
            borderRadius: 10,
            padding: "10px 14px",
            color: "#dc2626",
            fontSize: 14,
            marginBottom: 18,
          }}>
            {error}
          </div>
        )}

        {tab === "login" ? (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                E-mailadres
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="naam@voorbeeld.nl"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                Wachtwoord
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>
            <button type="submit" disabled={loading} style={primaryBtn}>
              {loading ? "Bezig..." : "Inloggen"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                Volledige naam
              </label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Voornaam Achternaam"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                E-mailadres
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="naam@voorbeeld.nl"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                Wachtwoord
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Minimaal 8 tekens"
                style={inputStyle}
              />
            </div>
            <button type="submit" disabled={loading} style={primaryBtn}>
              {loading ? "Bezig..." : "Account aanmaken"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#666" }}>
          Geen account nodig?{" "}
          <a href="/vacatures" style={{ color: "#0A66C2", textDecoration: "none", fontWeight: 600 }}>
            Bekijk vacatures
          </a>
        </div>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  border: "1.5px solid #e5e7eb",
  borderRadius: 10,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

const primaryBtn: React.CSSProperties = {
  padding: "13px 0",
  background: "linear-gradient(135deg, #0A66C2, #0952a0)",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 2px 12px rgba(10,102,194,0.25)",
  transition: "opacity 0.15s",
};
