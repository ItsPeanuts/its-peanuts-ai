import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="footer-inner flex items-center justify-between">
          <img src="/vorzaiq-logo-white.svg" alt="VorzaIQ" className="h-7" />
          <p className="text-sm">&copy; 2026 VorzaIQ. Find smarter. Hire faster.</p>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-4">
            <Link href="/privacy" className="text-xs text-gray-500 hover:text-gray-300 no-underline">
              Privacybeleid
            </Link>
            <Link href="/voorwaarden" className="text-xs text-gray-500 hover:text-gray-300 no-underline">
              Algemene Voorwaarden
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
