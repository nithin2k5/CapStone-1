"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "framer-motion";

/**
 * Figures read off the implementation, not the marketing copy:
 *   24  distinct channel labels in email_parser (channels.append sites)
 *    8  INSTRUCTION_PATTERNS classes in perceptual_analysis
 * 0.75  COMBINATION_STRENGTH["concealed_instructions_and_calm"]
 *   60  RiskEngine.QUARANTINE_THRESHOLD
 */
const stats = [
  { value: 5, decimals: 0, label: "Analysers scored independently" },
  { value: 24, decimals: 0, label: "Concealment channels detected" },
  { value: 8, decimals: 0, label: "Injection pattern classes" },
  { value: 0.75, decimals: 2, label: "Evidence weight when concealment meets calm" },
  { value: 60, decimals: 0, label: "Score at which mail is quarantined" },
];

function CountUp({ value, decimals }: { value: number; decimals: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setShown,
    });
    return () => controls.stop();
  }, [inView, value]);

  return <span ref={ref}>{shown.toFixed(decimals)}</span>;
}

export default function Stats() {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className={`panel-lift brackets group relative overflow-hidden px-4 py-7 text-center ${
                i === stats.length - 1 ? "col-span-2 sm:col-span-1" : ""
              }`}
            >
              <span
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(80% 80% at 50% 100%, var(--accent-subtle), transparent)",
                }}
              />
              <dt className="display text-gradient relative text-[2.4rem] sm:text-[2.9rem]">
                <CountUp value={stat.value} decimals={stat.decimals} />
              </dt>
              <dd className="relative mt-2 font-mono text-[10.5px] uppercase leading-snug tracking-[0.12em] text-muted-foreground">
                {stat.label}
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  );
}
