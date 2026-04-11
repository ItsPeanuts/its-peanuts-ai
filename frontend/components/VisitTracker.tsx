"use client";

import { useEffect } from "react";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://its-peanuts-backend.onrender.com";

function getSessionId(): string {
  const key = "vsid";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, id);
  }
  return id;
}

export default function VisitTracker() {
  useEffect(() => {
    try {
      const sessionId = getSessionId();
      const tracked = sessionStorage.getItem("vt_tracked");
      if (tracked) return; // al geteld deze sessie

      fetch(`${BASE}/analytics/visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      }).then(() => {
        sessionStorage.setItem("vt_tracked", "1");
      }).catch(() => {/* stil falen is OK */});
    } catch {
      // sessionStorage niet beschikbaar (bv. incognito met strenge settings)
    }
  }, []);

  return null;
}
