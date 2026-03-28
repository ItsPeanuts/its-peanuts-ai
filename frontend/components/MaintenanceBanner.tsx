"use client";

import { useEffect, useState } from "react";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://its-peanuts-backend.onrender.com";

export default function MaintenanceBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(`${BASE}/status`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setMessage(data.maintenance ? (data.message || "We zijn even bezig met een update. We zijn zo weer volledig online!") : null);
      } catch {
        // Stil falen — banner niet tonen bij netwerkfout
      }
    }

    check();
    const interval = setInterval(check, 60_000); // elke minuut checken
    return () => clearInterval(interval);
  }, []);

  if (!message) return null;

  return (
    <div
      className="w-full px-4 py-3 text-sm font-medium text-center text-white flex items-center justify-center gap-2"
      style={{ background: "#7C3AED" }}
    >
      <span>🔧</span>
      <span>{message}</span>
    </div>
  );
}
