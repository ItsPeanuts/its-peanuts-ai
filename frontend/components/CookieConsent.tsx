"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#1f2937",
        borderTop: "1px solid #374151",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <p style={{ color: "#d1d5db", fontSize: 13, margin: 0, maxWidth: 600 }}>
        Wij gebruiken functionele opslag (localStorage) om je ingelogd te houden en je voorkeuren op te slaan.
        Lees ons{" "}
        <Link href="/privacy" style={{ color: "#a78bfa", textDecoration: "underline" }}>
          privacybeleid
        </Link>{" "}
        voor meer informatie.
      </p>
      <button
        onClick={accept}
        style={{
          background: "#7C3AED",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "8px 20px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Begrepen
      </button>
    </div>
  );
}
