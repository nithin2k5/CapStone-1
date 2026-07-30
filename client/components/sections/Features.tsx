"use client";

import { motion } from "framer-motion";
import { MailSearch, Globe, FileWarning, BrainCircuit, BellRing, Activity } from "lucide-react";

const features = [
  {
    title: "Email Header Analysis",
    description: "Analyze sender headers, SPF, DKIM, DMARC, Received chains, Return Path and detect anomalies.",
    icon: MailSearch,
  },
  {
    title: "URL & Domain Filtering",
    description: "Scan every URL, check reputation, detect homograph attacks, blacklisted domains, shortened URLs.",
    icon: Globe,
  },
  {
    title: "Attachment Scanning",
    description: "Scan PDFs, ZIPs, Office documents, executables, scripts using malware detection.",
    icon: FileWarning,
  },
  {
    title: "AI Threat Detection",
    description: "Detect phishing patterns using Machine Learning and LLMs.",
    icon: BrainCircuit,
  },
  {
    title: "User Notification",
    description: "Generate detailed threat reports and notify users instantly.",
    icon: BellRing,
  },
  {
    title: "Impact Monitoring",
    description: "Display phishing statistics and detection performance.",
    icon: Activity,
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 relative z-10 bg-black">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl md:text-5xl font-bold mb-6 text-white"
          >
            Comprehensive <span className="text-gray-400">Threat Protection</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 text-lg"
          >
            Our multi-layered detection engine analyzes every aspect of incoming emails to ensure zero-day threats are neutralized before reaching the inbox.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="glass-card p-8 rounded-2xl relative overflow-hidden group border-white/[0.06] hover:border-white/10 transition-colors"
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-white/[0.04] border border-white/[0.08]">
                <feature.icon className="w-7 h-7 text-gray-400 group-hover:text-white transition-colors" />
              </div>

              <h3 className="text-xl font-bold mb-3 text-white group-hover:text-gray-200 transition-colors">
                {feature.title}
              </h3>

              <p className="text-gray-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
