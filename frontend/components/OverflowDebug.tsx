// TEMP DEBUG - remove after overflow is fixed
"use client";

import { useEffect, useState } from "react";

interface OffendingElement {
  tagName: string;
  className: string;
  offsetWidth: number;
  rightEdge: number;
}

export default function OverflowDebug() {
  const [offenders, setOffenders] = useState<OffendingElement[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only run on mobile viewports
    if (typeof window === "undefined" || window.innerWidth >= 768) return;

    function scanForOverflow() {
      const viewportWidth = document.documentElement.clientWidth;
      const all = document.querySelectorAll("*");
      const found: OffendingElement[] = [];

      all.forEach((el) => {
        if (found.length >= 3) return;
        try {
          const rect = el.getBoundingClientRect();
          if (rect.right > viewportWidth + 1) {
            // +1px tolerance for sub-pixel rounding
            found.push({
              tagName: el.tagName.toLowerCase(),
              className:
                (el as HTMLElement).className
                  ? String((el as HTMLElement).className).slice(0, 60)
                  : "(no class)",
              offsetWidth: (el as HTMLElement).offsetWidth,
              rightEdge: Math.round(rect.right),
            });
          }
        } catch {
          // getBoundingClientRect can throw on detached nodes — skip
        }
      });

      setOffenders(found);
    }

    // Run after paint so layout is settled
    const raf = requestAnimationFrame(() => {
      setTimeout(scanForOverflow, 300);
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  if (dismissed || offenders.length === 0) return null;

  return (
    /* TEMP DEBUG - remove after overflow is fixed */
    <div
      style={{
        position: "fixed",
        bottom: "1rem",
        left: "1rem",
        right: "1rem",
        backgroundColor: "#dc2626",
        color: "#fff",
        fontSize: "0.75rem",
        lineHeight: "1.4",
        padding: "0.75rem",
        borderRadius: "0.5rem",
        zIndex: 9999,
        wordBreak: "break-all",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "0.5rem",
        }}
      >
        <strong>OVERFLOW DEBUG ({offenders.length} offender{offenders.length !== 1 ? "s" : ""})</strong>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: "1rem",
            lineHeight: 1,
            cursor: "pointer",
            padding: "0 0 0 0.5rem",
            flexShrink: 0,
          }}
          aria-label="Sluiten"
        >
          ×
        </button>
      </div>
      {offenders.map((el, i) => (
        <div
          key={i}
          style={{
            marginBottom: i < offenders.length - 1 ? "0.4rem" : 0,
            paddingBottom: i < offenders.length - 1 ? "0.4rem" : 0,
            borderBottom:
              i < offenders.length - 1 ? "1px solid rgba(255,255,255,0.3)" : "none",
          }}
        >
          <span style={{ opacity: 0.75 }}>{i + 1}. </span>
          <strong>&lt;{el.tagName}&gt;</strong>{" "}
          <span style={{ opacity: 0.85 }}>
            w:{el.offsetWidth}px right:{el.rightEdge}px
          </span>
          <br />
          <span style={{ opacity: 0.7 }}>
            {el.className || "(no class)"}
          </span>
        </div>
      ))}
      <div style={{ marginTop: "0.4rem", opacity: 0.6, fontSize: "0.65rem" }}>
        viewport: {typeof window !== "undefined" ? document.documentElement.clientWidth : "?"}px
      </div>
    </div>
  );
}
