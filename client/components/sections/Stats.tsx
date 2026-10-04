"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "5", label: "Analysis layers scored" },
  { value: "17", label: "Concealment channels detected" },
  { value: "8", label: "Injection pattern classes" },
  { value: "2.5×", label: "Multiplier on a suppressed verdict" },
  { value: "15%", label: "Perceptual weight in final score" },
];

export default function Stats() {
  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <dl className="grid grid-cols-2 divide-border sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="px-2 py-8 lg:px-6"
            >
              <dt className="font-mono text-3xl font-semibold tracking-tight text-foreground">
                {stat.value}
              </dt>
              <dd className="mt-2 text-[13px] leading-snug text-muted-foreground">
                {stat.label}
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  );
}
