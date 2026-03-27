"use client";
import { useEffect } from "react";

/**
 * Voorkomt horizontaal scrollen van de pagina op iOS Safari.
 * Detecteert of een touch-beweging primair horizontaal is en blokkeert hem,
 * TENZIJ de gebruiker binnen een overflow-x: auto/scroll container zit.
 */
export default function NoHorizontalScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let startX = 0;
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);

      // Alleen blokkeren als beweging primair horizontaal is (> 5px drempel)
      if (dx <= dy || dx <= 5) return;

      // Loop omhoog door de DOM: zit de vinger in een horizontaal scrollbare container?
      let el = e.target as HTMLElement | null;
      while (el && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        const ox = style.overflowX;
        if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth) {
          return; // container mag horizontaal scrollen — laat door
        }
        el = el.parentElement;
      }

      // Geen scrollbare parent → blokkeer horizontale page-scroll
      e.preventDefault();
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return null;
}
