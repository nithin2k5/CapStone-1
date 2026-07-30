"use client";

import { motion } from "framer-motion";
import { Server, ShieldAlert, Database, Bell, LayoutDashboard, ArrowDown } from "lucide-react";

const architectureSteps = [
  { name: "Frontend / Mail Server", icon: Server, color: "text-blue-400", border: "border-blue-500/30" },
  { name: "API Gateway", icon: LayoutDashboard, color: "text-indigo-400", border: "border-indigo-500/30" },
  { name: "Detection Engine", icon: ShieldAlert, color: "text-red-400", border: "border-red-500/30" },
  { 
    name: "Analysis Modules", 
    isGroup: true,
    modules: [
      { name: "Header Analyzer" },
      { name: "URL Scanner" },
      { name: "Attachment Scanner" },
      { name: "AI Risk Engine" }
    ]
  },
  { name: "Threat Database", icon: Database, color: "text-purple-400", border: "border-purple-500/30" },
  { name: "Notification Service", icon: Bell, color: "text-amber-400", border: "border-amber-500/30" },
  { name: "SOC Dashboard", icon: LayoutDashboard, color: "text-green-400", border: "border-green-500/30" },
];

export default function Architecture() {
  return (
    <section id="architecture" className="py-24 relative z-10 bg-black/40">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl md:text-5xl font-bold mb-6"
          >
            System <span className="text-gradient-blue">Architecture</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 text-lg"
          >
            A highly scalable, microservices-based pipeline designed to process and analyze emails in milliseconds.
          </motion.p>
        </div>

        <div className="max-w-4xl mx-auto relative">
          {/* Animated Connecting Line Background */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/5 -translate-x-1/2 z-0 hidden md:block" />
          
          <motion.div 
            className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-green-500 -translate-x-1/2 z-0 hidden md:block"
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
                    className="w-full max-w-2xl glass-card p-6 rounded-2xl border border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4"
                  >
                    {step.modules?.map((mod, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors cursor-default shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]">
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
                    className={`glass-card px-8 py-5 rounded-2xl border ${step.border} flex items-center gap-4 min-w-[280px] justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-shadow`}
                  >
                    {step.icon && <step.icon className={`w-6 h-6 ${step.color}`} />}
                    <span className="font-bold text-lg">{step.name}</span>
                  </motion.div>
                )}

                {/* Arrow Down */}
                {index < architectureSteps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: (index + 0.5) * 0.2 }}
                    className="my-4 text-gray-500 md:hidden"
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
