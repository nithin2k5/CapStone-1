"use client";

import { motion } from "framer-motion";
import { ShieldCheck, FileText, Lock, CheckCircle, Fingerprint, MailCheck } from "lucide-react";

const standards = [
  { name: "ISO 27001", icon: ShieldCheck, desc: "Information Security Management" },
  { name: "RFC 5322", icon: FileText, desc: "Internet Message Format" },
  { name: "NIST 800-45", icon: Lock, desc: "Electronic Mail Security" },
  { name: "SPF", icon: CheckCircle, desc: "Sender Policy Framework" },
  { name: "DKIM", icon: Fingerprint, desc: "DomainKeys Identified Mail" },
  { name: "DMARC", icon: MailCheck, desc: "Domain-based Message Authentication" },
];

export default function Standards() {
  return (
    <section className="py-24 relative z-10 bg-black border-y border-white/[0.06]">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl md:text-5xl font-bold mb-6 text-white"
          >
            Compliant with <span className="text-gray-400">Global Standards</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 text-lg"
          >
            Built from the ground up to meet and exceed industry security requirements.
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {standards.map((std, index) => (
            <motion.div
              key={std.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="glass-card p-6 rounded-2xl flex flex-col items-center text-center group border-white/[0.06] hover:border-white/10 transition-all duration-300"
            >
              <std.icon className="w-8 h-8 text-gray-500 group-hover:text-white transition-colors mb-4" />
              <h3 className="font-bold text-white mb-2">{std.name}</h3>
              <p className="text-xs text-gray-600 group-hover:text-gray-400 transition-colors">{std.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
