"use client";
import { useEffect } from "react";

/**
 * Voorkomt horizontaal scrollen op iOS Safari via twee mechanismen:
 * 1. touchmove preventDefault op horizontale swipes
 * 2. scroll-event reset: als window.scrollX != 0, spring terug naar 0
 */
export default function NoHorizontalScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let startX = 0;
    let startY = 0;
    let resetting = false;

    // ── Touchmove blocker ──────────────────────────────────────────────────
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);

      if (dx <= dy || dx <= 5) return;

      // Zit de vinger in een horizontaal scrollbare container?
      let el = e.target as HTMLElement | null;
      while (el && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        const ox = style.overflowX;
        if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth) {
          return;
        }
        el = el.parentElement;
      }

      e.preventDefault();
    };

    // ── Scroll reset: als de pagina toch horizontaal scrollt, spring terug ─
    const onScroll = () => {
      if (resetting) return;
      if (window.scrollX !== 0) {
        resetting = true;
        window.scrollTo(0, window.scrollY);
        requestAnimationFrame(() => { resetting = false; });
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
