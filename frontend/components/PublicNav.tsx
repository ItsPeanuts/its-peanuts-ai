import Link from "next/link";

export default function PublicNav() {
  return (
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
            href="/candidate/login"
            className="ml-3 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-600 transition-colors no-underline"
          >
            Inloggen
          </Link>
        </nav>
      </div>
    </header>
  );
}
