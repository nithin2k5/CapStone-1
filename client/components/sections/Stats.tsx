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
    <section className="py-20 relative z-10 border-y border-white/[0.06] bg-black">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center justify-center text-center space-y-2 group"
            >
              <div className="font-heading text-4xl md:text-5xl font-bold text-white group-hover:text-gray-300 transition-colors duration-300">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500 uppercase tracking-wider font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
