"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/**
 * Inertial page scrolling for the whole site. Nested scroll areas (modals,
 * sidebars, panels) keep native scrolling, and anchor links glide to their
 * target, clearing the fixed navbar. Skipped entirely under reduced motion.
 */
export function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      lerp: 0.055,
      wheelMultiplier: 0.8,
      smoothWheel: true,
      autoRaf: true,
      allowNestedScroll: true,
      anchors: { offset: -88 },
    });
    lenisRef.current = lenis;

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Next resets the window on navigation; keep Lenis's target in step with it
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
  }, [pathname]);

  return null;
}
