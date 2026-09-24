"use client";

import { motion } from "framer-motion";
import { Server, ShieldAlert, Database, Scan, LayoutDashboard, ArrowDown } from "lucide-react";

const architectureSteps = [
  { name: "Gmail / Microsoft Graph", icon: Server },
  { name: "FastAPI Service", icon: LayoutDashboard },
  { name: "Dual-Channel Parser", icon: Scan },
  {
    name: "Analysis Layers",
    isGroup: true,
    modules: [
      { name: "Header Analyzer" },
      { name: "URL Scanner" },
      { name: "Attachment Scanner" },
      { name: "LLM Content Analyzer" },
      { name: "Perceptual Analyzer" },
    ],
  },
  { name: "Risk Engine", icon: ShieldAlert },
  { name: "Quarantine + Store", icon: Database },
  { name: "Analyst Dashboard", icon: LayoutDashboard },
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
            className="font-heading text-3xl md:text-5xl font-bold mb-6 text-foreground"
          >
            System <span className="text-gradient-blue">Architecture</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg"
          >
            The gateway reads mail after delivery over the provider API, so it never sits in the send path. The parser splits each message into what the recipient renders and what the model ingests; every layer downstream sees both.
          </motion.p>
        </div>

        <div className="max-w-4xl mx-auto relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-purple-500/20 -translate-x-1/2 z-0 hidden md:block" />

          <motion.div
            className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 via-indigo-500 to-blue-500 -translate-x-1/2 z-0 hidden md:block shadow-[0_0_20px_rgba(139,92,246,0.7)] rounded-full"
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
                    className="w-full max-w-2xl glass-card p-6 rounded-2xl border border-purple-500/30 grid grid-cols-2 md:grid-cols-3 gap-4 shadow-[0_0_30px_rgba(139,92,246,0.15)]"
                  >
                    {step.modules?.map((mod, i) => (
                      <div
                        key={i}
                        className="bg-purple-500/5 border border-purple-500/25 rounded-xl p-4 text-center text-sm font-medium text-purple-200 hover:bg-purple-500/20 hover:text-foreground hover:border-purple-400 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all"
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
                    className="glass-card px-8 py-5 rounded-2xl border border-indigo-500/30 flex items-center gap-4 min-w-[280px] justify-center hover:border-purple-400 hover:shadow-[0_0_25px_rgba(139,92,246,0.25)] transition-all duration-300"
                  >
                    {step.icon && <step.icon className="w-6 h-6 text-purple-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]" />}
                    <span className="font-bold text-lg text-foreground">{step.name}</span>
                  </motion.div>
                )}

                {index < architectureSteps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="my-4 text-purple-400 md:hidden"
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
