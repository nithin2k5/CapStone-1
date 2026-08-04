"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";

const phases = [
  {
    phase: "Phase 1",
    title: "Email Header Analysis",
    description: "Implementation of SPF, DKIM, and DMARC validation along with anomaly detection in routing headers.",
    status: "completed"
  },
  {
    phase: "Phase 2",
    title: "URL Filtering",
    description: "Integration of real-time domain reputation checks and homograph attack detection algorithms.",
    status: "completed"
  },
  {
    phase: "Phase 3",
    title: "Attachment Scanning",
    description: "Sandboxed execution and static analysis of attachments using YARA rules and machine learning.",
    status: "in-progress"
  },
  {
    phase: "Phase 4",
    title: "Deployment",
    description: "Containerization and orchestration of the microservices architecture using Kubernetes.",
    status: "upcoming"
  },
  {
    phase: "Phase 5",
    title: "Monitoring",
    description: "Setup of SOC dashboard, alerting mechanisms, and continuous model retraining pipeline.",
    status: "upcoming"
  }
];

export default function ResearchTimeline() {
  return (
    <section id="research" className="py-24 relative z-10 bg-black">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl md:text-5xl font-bold mb-6 text-white"
          >
            Research <span className="text-gradient">Objectives</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 text-lg"
          >
            Our roadmap to building the ultimate quantum-resistant phishing prevention gateway.
          </motion.p>
        </div>

        <div className="max-w-3xl mx-auto relative">
          {/* Vertical Line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-purple-500/20 md:-translate-x-1/2" />
          
          <motion.div 
            className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 via-indigo-500 to-blue-500 md:-translate-x-1/2 origin-top rounded-full shadow-[0_0_15px_rgba(139,92,246,0.6)]"
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />

          <div className="space-y-12">
            {phases.map((phase, index) => (
              <div key={index} className={`relative flex flex-col md:flex-row gap-8 items-start md:items-center ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                
                {/* Timeline Node */}
                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-black border-2 border-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.7)] z-10">
                  {phase.status === "completed" ? (
                    <CheckCircle2 className="w-6 h-6 text-purple-400 bg-black rounded-full drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                  ) : phase.status === "in-progress" ? (
                    <div className="w-4 h-4 rounded-full bg-blue-400 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                  ) : (
                    <Circle className="w-5 h-5 text-indigo-900" />
                  )}
                </div>

                {/* Content */}
                <motion.div 
                  initial={{ opacity: 0, x: index % 2 === 0 ? 50 : -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className={`ml-16 md:ml-0 md:w-1/2 glass-card p-6 rounded-2xl border border-indigo-500/20 hover:border-purple-500/50 hover:shadow-[0_0_25px_rgba(139,92,246,0.2)] transition-all ${index % 2 === 0 ? "md:pl-12" : "md:pr-12 text-left md:text-right"}`}
                >
                  <div className={`text-xs font-mono tracking-wider mb-2 uppercase font-bold ${phase.status === "completed" ? "text-purple-400" : phase.status === "in-progress" ? "text-blue-400 animate-pulse" : "text-zinc-500"}`}>
                    {phase.phase} // {phase.status}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{phase.title}</h3>
                  <p className="text-gray-400 leading-relaxed">
                    {phase.description}
                  </p>
                </motion.div>
                
                <div className="hidden md:block md:w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
