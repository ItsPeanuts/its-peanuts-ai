import Link from "next/link";

export default function PublicNav() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center no-underline group">
          <img src="/vorzaiq-logo.svg" alt="VorzaIQ" className="h-9" />
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
