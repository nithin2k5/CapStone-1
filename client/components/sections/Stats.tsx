"use client";

import { motion } from "framer-motion";

/**
 * Figures read off the implementation, not the marketing copy:
 *   24  distinct channel labels in email_parser (channels.append sites)
 *    8  INSTRUCTION_PATTERNS classes in perceptual_analysis
 * 0.75  COMBINATION_STRENGTH["concealed_instructions_and_calm"]
 *   60  RiskEngine.QUARANTINE_THRESHOLD
 */
const stats = [
  { value: "5", label: "Analysers scored independently" },
  { value: "24", label: "Concealment channels detected" },
  { value: "8", label: "Injection pattern classes" },
  { value: "0.75", label: "Evidence weight when concealment meets calm" },
  { value: "60", label: "Score at which mail is quarantined" },
];

export default function Stats() {
  return (
    <section className="relative border-y border-border bg-secondary/60">
      <div className="rule-fade absolute inset-x-0 top-0 h-px" />
      <div className="rule-fade absolute inset-x-0 bottom-0 h-px" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <dl className="grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className="group relative px-3 py-10 text-center lg:px-6"
            >
              <span
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    "linear-gradient(to top, var(--accent-subtle), transparent 70%)",
                }}
              />
              <dt className="display text-gradient relative text-[2.4rem] sm:text-[2.9rem]">
                {stat.value}
              </dt>
              <dd className="relative mt-2 font-mono text-[11px] uppercase leading-snug tracking-[0.12em] text-muted-foreground">
                {stat.label}
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  );
}
