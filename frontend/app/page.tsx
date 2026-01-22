"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { login, me } from "@/lib/api";
import { setSession, type Role } from "@/lib/session";

export default function HomePage() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("candidate");
  const [email, setEmail] = useState(role === "candidate" ? "candidate1@itspeanuts.ai" : "employer@itspeanuts.ai");
  const [password, setPassword] = useState("Test123!123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // update default email if role changes (zonder je input te slopen als je al typt)
  useMemo(() => {
    if (email === "candidate1@itspeanuts.ai" || email === "employer@itspeanuts.ai") {
      setEmail(role === "candidate" ? "candidate1@itspeanuts.ai" : "employer@itspeanuts.ai");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function onLogin() {
    setErr("");
    setLoading(true);
    try {
      const token = await login(email, password);

      // rol checken via /auth/me zodat we zeker weten dat token klopt
      const user = await me(token);
      const userRole = (user.role || role) as Role;

      setSession(token, userRole);

      router.push(userRole === "employer" ? "/employer" : "/candidate");
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16, fontFamily: "system-ui, -apple-system" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>It’s Peanuts AI — MVP</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Log in als Candidate of Employer. (Dit is alleen de UI-laag; backend draait al.)
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          onClick={() => setRole("candidate")}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #333",
            background: role === "candidate" ? "#111" : "transparent",
            color: role === "candidate" ? "#fff" : "#111",
            cursor: "pointer",
          }}
        >
          Candidate
        </button>
        <button
          onClick={() => setRole("employer")}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #333",
            background: role === "employer" ? "#111" : "transparent",
            color: role === "employer" ? "#fff" : "#111",
            cursor: "pointer",
          }}
        >
          Employer
        </button>
      </div>

      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
        <label style={{ display: "block", fontSize: 12, opacity: 0.7 }}>Email</label>
        <input
          value={email}
          onChange={(v) => setEmail(v.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc", marginBottom: 12 }}
        />

        <label style={{ display: "block", fontSize: 12, opacity: 0.7 }}>Password</label>
        <input
          value={password}
          type="password"
          onChange={(v) => setPassword(v.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc", marginBottom: 12 }}
        />

        <button
          onClick={onLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {err ? <p style={{ color: "crimson", marginTop: 12 }}>{err}</p> : null}

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
          Tip: standaard test accounts zijn al bekend (candidate1@itspeanuts.ai / employer@itspeanuts.ai).
        </div>
      </div>
    </main>
  );
}
