export default function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-white font-bold text-xs">
              V
            </div>
            <span className="font-semibold text-white text-sm">VorzaIQ</span>
          </div>
          <p className="text-sm">&copy; 2025 VorzaIQ. Find smarter. Hire faster.</p>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-800 text-center">
          <span className="text-xs text-gray-600">Powered by It&apos;s Peanuts AI</span>
        </div>
      </div>
    </footer>
  );
}
