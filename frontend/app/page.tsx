import Link from "next/link";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#020617" }}>
      <div style={{ padding: 32, borderRadius: 16, background: "#020617", border: "1px solid #1e293b", maxWidth: 420, width: "100%", color: "white" }}>
        <h1>It’s Peanuts AI</h1>
        <p>Slimme AI-selectie vóór het eerste gesprek.</p>

        <div style={{ marginTop: 24 }}>
          <Link href="/employer/login">
            <button style={{ width: "100%", padding: 12, marginBottom: 12 }}>Inloggen werkgever</button>
          </Link>

          <Link href="/candidate/login">
            <button style={{ width: "100%", padding: 12 }}>Kandidaten login</button>
          </Link>
        </div>
      </div>
    </main>
  );
}

