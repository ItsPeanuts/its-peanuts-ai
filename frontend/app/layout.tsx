import type { Metadata } from "next";
import Link from "next/link";
import "../styles.css";

export const metadata: Metadata = {
  title: "It's Peanuts AI — Slim solliciteren & slim werven",
  description: "AI-powered recruitment platform voor kandidaten en werkgevers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>
        <div className="app">
          <header className="header">
            <div className="header-content">
              <Link href="/" className="logo" style={{ textDecoration: "none" }}>
                <span className="logo-icon">🥜</span>
                <div>
                  <h1>It&apos;s Peanuts AI</h1>
                  <p className="tagline">Slim solliciteren &amp; slim werven met AI</p>
                </div>
              </Link>
              <nav className="nav-tabs">
                <Link href="/vacatures" className="nav-tab">
                  <span className="icon">💼</span> Vacatures
                </Link>
                <Link href="/candidate" className="nav-tab">
                  <span className="icon">👤</span> Kandidaten
                </Link>
                <Link href="/employer" className="nav-tab">
                  <span className="icon">🏢</span> Werkgevers
                </Link>
              </nav>
            </div>
          </header>

          {children}

          <footer className="footer">
            <p>&copy; 2025 It&apos;s Peanuts AI. Slim solliciteren &amp; slim werven.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
