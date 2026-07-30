"use client";

import { motion } from "framer-motion";
import { Server, ShieldAlert, Database, Bell, LayoutDashboard, ArrowDown } from "lucide-react";

const architectureSteps = [
  { name: "Frontend / Mail Server", icon: Server },
  { name: "API Gateway", icon: LayoutDashboard },
  { name: "Detection Engine", icon: ShieldAlert },
  {
    name: "Analysis Modules",
    isGroup: true,
    modules: [
      { name: "Header Analyzer" },
      { name: "URL Scanner" },
      { name: "Attachment Scanner" },
      { name: "AI Risk Engine" },
    ],
  },
  { name: "Threat Database", icon: Database },
  { name: "Notification Service", icon: Bell },
  { name: "SOC Dashboard", icon: LayoutDashboard },
];

export default function Architecture() {
  return (
    <section id="architecture" className="py-24 relative z-10 bg-black">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl md:text-5xl font-bold mb-6 text-white"
          >
            System <span className="text-gray-400">Architecture</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 text-lg"
          >
            A highly scalable, microservices-based pipeline designed to process and analyze emails in milliseconds.
          </motion.p>
        </div>

        <div className="max-w-4xl mx-auto relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/[0.06] -translate-x-1/2 z-0 hidden md:block" />

          <motion.div
            className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20 -translate-x-1/2 z-0 hidden md:block"
            initial={{ height: 0 }}
            whileInView={{ height: "100%" }}
            viewport={{ once: true }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />

          <div className="flex flex-col items-center gap-6 relative z-10">
            {architectureSteps.map((step, index) => (
              <div key={index} className="w-full flex flex-col items-center">
                {step.isGroup ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.2 }}
                    className="w-full max-w-2xl glass-card p-6 rounded-2xl border border-white/[0.06] grid grid-cols-2 md:grid-cols-4 gap-4"
                  >
                    {step.modules?.map((mod, i) => (
                      <div
                        key={i}
                        className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center text-sm font-medium text-gray-400 hover:bg-white/[0.06] hover:text-white transition-colors"
                      >
                        {mod.name}
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.2 }}
                    className="glass-card px-8 py-5 rounded-2xl border border-white/[0.08] flex items-center gap-4 min-w-[280px] justify-center hover:border-white/15 transition-colors"
                  >
                    {step.icon && <step.icon className="w-6 h-6 text-gray-400" />}
                    <span className="font-bold text-lg text-white">{step.name}</span>
                  </motion.div>
                )}

                {index < architectureSteps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="my-4 text-gray-600 md:hidden"
                  >
                    <ArrowDown className="w-6 h-6 animate-bounce" />
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
