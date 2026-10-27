"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

// Sign in and sign up are one panel that switches in place, so they share a
// key; remounting it here would cut off the panel's own animation.
function group(pathname: string) {
  return pathname === "/login" || pathname === "/signup" ? "access" : pathname;
}

/**
 * Eases the card to the height of whatever it holds, so a taller form grows
 * the card instead of snapping it, and fades in a page reached by navigation.
 */
export function AuthTransition({ children }: { children: React.ReactNode }) {
  const key = group(usePathname());
  const reduce = useReducedMotion();
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      animate={{ height }}
      initial={false}
      transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
      // Overflow is clipped only so the height tween can shrink the card; the
      // padding gives input focus rings room inside the clip.
      className="-m-1.5 overflow-hidden"
    >
      <div ref={inner} className="p-1.5">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: reduce ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
        >
          {children}
        </motion.div>
      </div>
    </motion.div>
  );
}
