"use client";

import { motion } from "framer-motion";
import { MailSearch, Globe, FileWarning, BrainCircuit, BellRing, Activity } from "lucide-react";

const features = [
  {
    title: "Email Header Analysis",
    description: "Analyze sender headers, SPF, DKIM, DMARC, Received chains, Return Path and detect anomalies.",
    icon: MailSearch,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    title: "URL & Domain Filtering",
    description: "Scan every URL, check reputation, detect homograph attacks, blacklisted domains, shortened URLs.",
    icon: Globe,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  {
    title: "Attachment Scanning",
    description: "Scan PDFs, ZIPs, Office documents, executables, scripts using malware detection.",
    icon: FileWarning,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  {
    title: "AI Threat Detection",
    description: "Detect phishing patterns using Machine Learning and LLMs.",
    icon: BrainCircuit,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
  },
  {
    title: "User Notification",
    description: "Generate detailed threat reports and notify users instantly.",
    icon: BellRing,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    title: "Impact Monitoring",
    description: "Display phishing statistics and detection performance.",
    icon: Activity,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 relative z-10">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl md:text-5xl font-bold mb-6"
          >
            Comprehensive <span className="text-gradient-blue">Threat Protection</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 text-lg"
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
              className="glass-card p-8 rounded-2xl relative overflow-hidden group"
            >
              {/* Hover Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${feature.bg} ${feature.border} border transition-colors duration-300`}>
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>
              
              <h3 className="text-xl font-bold mb-3 text-white group-hover:text-blue-400 transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>

              {/* Glowing Corner */}
              <div className="absolute -bottom-2 -right-2 w-24 h-24 bg-blue-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
