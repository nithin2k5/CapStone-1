"use client";

import { motion } from "framer-motion";
import { MailSearch, Globe, FileWarning, BrainCircuit, BellRing, Activity } from "lucide-react";

const features = [
  {
    title: "Email Header Analysis",
    description: "Analyze sender headers, SPF, DKIM, DMARC, Received chains, Return Path and detect anomalies.",
    icon: MailSearch,
    gradient: "from-purple-500 to-indigo-500",
  },
  {
    title: "URL & Domain Filtering",
    description: "Scan every URL, check reputation, detect homograph attacks, blacklisted domains, shortened URLs.",
    icon: Globe,
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    title: "Attachment Scanning",
    description: "Scan PDFs, ZIPs, Office documents, executables, scripts using malware detection.",
    icon: FileWarning,
    gradient: "from-blue-500 to-purple-500",
  },
  {
    title: "AI Threat Detection",
    description: "Detect phishing patterns using Machine Learning and LLMs.",
    icon: BrainCircuit,
    gradient: "from-purple-500 via-indigo-500 to-blue-500",
  },
  {
    title: "User Notification",
    description: "Generate detailed threat reports and notify users instantly.",
    icon: BellRing,
    gradient: "from-indigo-400 to-purple-400",
  },
  {
    title: "Impact Monitoring",
    description: "Display phishing statistics and detection performance.",
    icon: Activity,
    gradient: "from-blue-400 to-indigo-500",
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
            className="font-heading text-3xl md:text-5xl font-bold mb-6 text-foreground"
          >
            Comprehensive <span className="text-gradient">Threat Protection</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg"
          >
            Our multi-layered detection engine analyzes every aspect of incoming emails to ensure zero-day threats are neutralized before reaching the inbox.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -6 }}
              className="glass-card p-8 rounded-2xl relative overflow-hidden group border-indigo-500/20 hover:border-purple-500/50 hover:shadow-[0_0_35px_rgba(139,92,246,0.22)] transition-all duration-300 bg-neutral-950/90"
            >
              {/* Top accent gradient line */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} opacity-70 group-hover:opacity-100 transition-opacity`} />

              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-purple-500/10 border border-purple-500/30 group-hover:border-purple-400/60 shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all">
                <feature.icon className="w-7 h-7 text-purple-400 group-hover:text-blue-300 transition-colors duration-300" />
              </div>

              <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-purple-300 transition-colors duration-300">
                {feature.title}
              </h3>

              <p className="text-muted-foreground leading-relaxed group-hover:text-gray-300 transition-colors">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
