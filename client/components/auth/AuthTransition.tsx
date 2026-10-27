"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

// Left-to-right order of the pages, so moving forward (sign in → sign up)
// slides the new form in from the right and moving back from the left.
const ORDER: Record<string, number> = {
  "/login": 0,
  "/forgot-password": 1,
  "/reset-password": 2,
  "/signup": 3,
};

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Animates the card when the route changes: the new form slides in from the
 * direction of travel while the card eases to its new height. The App Router
 * swaps the page out immediately, so there is no exit to animate; the height
 * tween is what keeps the swap from jumping.
 */
export function AuthTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [route, setRoute] = useState({ path: pathname, dir: 0 });

  // Derived during render rather than in an effect, so the first frame of the
  // new page already knows which way to slide.
  if (route.path !== pathname) {
    const from = ORDER[route.path] ?? 0;
    const to = ORDER[pathname] ?? 0;
    setRoute({ path: pathname, dir: to >= from ? 1 : -1 });
  }

  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const offset = reduce ? 0 : route.dir * 48;

  return (
    <motion.div
      animate={{ height }}
      initial={false}
      transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
      // Overflow is clipped only so the height tween can shrink the card; the
      // padding gives input focus rings room inside the clip.
      className="-m-1.5 overflow-hidden"
    >
      <div ref={inner} className="p-1.5">
        <motion.div
          key={pathname}
          initial={route.dir === 0 ? false : { opacity: 0, x: offset, filter: "blur(6px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
        >
          {children}
        </motion.div>
      </div>
    </motion.div>
  );
}
