import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
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
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 no-underline group">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
                P
              </div>
              <div>
                <span className="font-bold text-gray-900 text-base leading-tight block">
                  It&apos;s Peanuts AI
                </span>
                <span className="text-xs text-gray-400 leading-tight block hidden sm:block">
                  Slim solliciteren &amp; slim werven
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-1">
              <Link
                href="/vacatures"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-primary hover:bg-primary-50 transition-colors no-underline"
              >
                Vacatures
              </Link>
              <Link
                href="/candidate"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-primary hover:bg-primary-50 transition-colors no-underline"
              >
                Kandidaten
              </Link>
              <Link
                href="/employer/login"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-primary hover:bg-primary-50 transition-colors no-underline"
              >
                Werkgevers
              </Link>
              <Link
                href="/ai-test"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-primary hover:bg-primary-50 transition-colors no-underline"
              >
                🤖 AI Test
              </Link>
              <Link
                href="/candidate/login"
                className="ml-3 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-600 transition-colors no-underline"
              >
                Inloggen
              </Link>
            </nav>
          </div>
        </header>

        {children}

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 mt-16">
          <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-white font-bold text-xs">
                  P
                </div>
                <span className="font-semibold text-white text-sm">It&apos;s Peanuts AI</span>
              </div>
              <p className="text-sm">&copy; 2025 It&apos;s Peanuts AI. Slim solliciteren &amp; slim werven.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
