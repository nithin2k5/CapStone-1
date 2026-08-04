"use client";

import { motion } from "framer-motion";

const stats = [
  { label: "Emails Protected", value: "2.5M+" },
  { label: "Threats Blocked", value: "195K" },
  { label: "Malware Attachments", value: "18K" },
  { label: "Malicious URLs", value: "420K" },
  { label: "Detection Accuracy", value: "99.4%" },
];

export default function Stats() {
  return (
    <section className="py-20 relative z-10 border-y border-purple-500/20 bg-black/90 shadow-[0_0_40px_rgba(139,92,246,0.08)]">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center justify-center text-center space-y-2 group p-4 rounded-2xl hover:bg-purple-500/5 border border-transparent hover:border-purple-500/20 transition-all duration-300"
            >
              <div className="font-heading text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400 group-hover:from-purple-300 group-hover:to-blue-300 transition-all duration-300 drop-shadow-[0_0_12px_rgba(139,92,246,0.3)]">
                {stat.value}
              </div>
              <div className="text-sm text-indigo-200/70 uppercase tracking-wider font-semibold">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
