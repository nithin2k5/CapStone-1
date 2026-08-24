"use client";

import { motion } from "framer-motion";
import { ShieldAlert, Activity, Globe, Mail, AlertTriangle, XSquare } from "lucide-react";

export default function DashboardPreview() {
  return (
    <section id="dashboard" className="py-24 relative z-10 bg-[#050505] border-t-4 border-[#333333] border-b-4">
      <div className="container mx-auto px-6">
        <div className="text-left max-w-3xl mb-16 border-l-8 border-[#10B981] pl-6">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="font-heading text-4xl md:text-6xl font-black mb-4 text-[#e0e0e0] uppercase"
          >
            ENTERPRISE <span className="text-[#10B981]">SOC DASHBOARD</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[#888888] text-lg font-mono"
          >
            [SYSTEM_OVERVIEW] Real-time visibility into incoming payloads and intercepted threats.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="border-2 border-[#333333] bg-[#0A0A0A] shadow-[10px_10px_0px_0px_rgba(16,185,129,0.3)] relative"
        >
          <div className="bg-[#121212] border-b-2 border-[#333333] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-[#10B981] animate-pulse" />
              <span className="font-mono text-sm text-[#e0e0e0] font-bold tracking-widest uppercase">LIVE THREAT FEED</span>
            </div>
            <div className="flex gap-2">
              <div className="w-4 h-4 border border-[#10B981]" />
              <div className="w-4 h-4 border border-[#FFD700]" />
              <div className="w-4 h-4 border border-[#00FF41]" />
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <div className="p-6 border-2 border-[#333333] bg-[#050505] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 bg-[#10B981] text-[#050505] font-bold text-xs">CRITICAL</div>
                <h3 className="text-[#888888] text-sm font-bold tracking-widest mb-6 flex items-center gap-2 uppercase">
                  <Activity className="w-4 h-4 text-[#10B981]" /> Global Risk Score
                </h3>
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="64" cy="64" r="56" className="stroke-[#111]" strokeWidth="8" fill="none" />
                      <motion.circle
                         cx="64" cy="64" r="56"
                         className="stroke-[#10B981]"
                         strokeWidth="8" fill="none"
                         strokeDasharray="351"
                         initial={{ strokeDashoffset: 351 }}
                         whileInView={{ strokeDashoffset: 351 - (351 * 0.78) }}
                         viewport={{ once: true }}
                         transition={{ duration: 1.5, ease: "easeOut" }}
                       />
                     </svg>
                     <div className="absolute text-4xl font-black text-[#e0e0e0]">78</div>
                  </div>
                </div>
                <div className="text-center mt-6 text-[#10B981] text-sm font-black tracking-widest uppercase">HIGH RISK STATE</div>
              </div>

              <div className="p-6 border-2 border-[#333333] bg-[#050505]">
                <h3 className="text-[#888888] text-sm font-bold tracking-widest mb-4 flex items-center gap-2 uppercase">
                  <Globe className="w-4 h-4 text-[#00F0FF]" /> Attack Vectors
                </h3>
                <div className="space-y-4">
                  {[
                    { source: "Botnet-A", percent: 45 },
                    { source: "Spoofed Domains", percent: 30 },
                    { source: "Malicious IPs", percent: 15 },
                    { source: "Zero-Day Files", percent: 10 },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1 font-mono uppercase">
                        <span className="text-[#e0e0e0] font-bold">{item.source}</span>
                        <span className="text-[#00F0FF]">{item.percent}%</span>
                      </div>
                      <div className="h-3 w-full bg-[#111] border border-[#333]">
                        <motion.div
                          className="h-full bg-[#00F0FF]"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${item.percent}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 border-2 border-[#333333] bg-[#050505] h-64 flex flex-col">
                <h3 className="text-[#888888] text-sm font-bold tracking-widest mb-4 flex items-center gap-2 uppercase">
                  <ShieldAlert className="w-4 h-4 text-[#FFD700]" /> Threat Activity (Last 24h)
                </h3>
                <div className="flex-1 flex items-end gap-1">
                  {[42, 38, 55, 48, 62, 71, 65, 58, 82, 91, 88, 76, 69, 74, 85, 92, 98, 87, 79, 83, 95, 88, 76, 69].map((height, i) => (
                    <motion.div
                      key={i}
                      className={`flex-1 transition-all ${height > 85 ? "bg-[#10B981]" : "bg-[#333333]"}`}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${height}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.02 }}
                    />
                  ))}
                </div>
              </div>

              <div className="p-6 border-2 border-[#333333] bg-[#050505]">
                <h3 className="text-[#888888] text-sm font-bold tracking-widest mb-4 flex items-center gap-2 uppercase">
                  <Mail className="w-4 h-4 text-[#00F0FF]" /> Intercepted Payloads
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-sm">
                    <thead>
                      <tr className="text-[#888888] border-b-2 border-[#333333]">
                        <th className="pb-2 font-bold uppercase">Time</th>
                        <th className="pb-2 font-bold uppercase">Sender</th>
                        <th className="pb-2 font-bold uppercase">Subject</th>
                        <th className="pb-2 font-bold uppercase">Threat Type</th>
                        <th className="pb-2 font-bold uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#e0e0e0]">
                      {[
                        { time: "10:42 AM", sender: "admin@paypaI.com", subject: "Account Suspended", type: "Phishing" },
                        { time: "10:38 AM", sender: "hr@company-portal.net", subject: "Q3 Bonus Document", type: "Malware (PDF)" },
                        { time: "10:15 AM", sender: "support@microsoft-update.com", subject: "Action Required", type: "Spoofing" },
                        { time: "09:55 AM", sender: "unknown@192.168.x.x", subject: "Invoice #9921", type: "Malicious URL" },
                      ].map((row, i) => (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.2, delay: i * 0.1 }}
                          className="border-b border-[#111] hover:bg-[#333333]/50 transition-colors"
                        >
                          <td className="py-3 text-[#888888] text-xs">{row.time}</td>
                          <td className="py-3 text-[#10B981] text-xs font-bold">{row.sender}</td>
                          <td className="py-3 truncate max-w-[150px]">{row.subject}</td>
                          <td className="py-3 flex items-center gap-1.5 text-xs text-[#FFD700]">
                            <AlertTriangle className="w-3.5 h-3.5" /> {row.type}
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-1 bg-[#10B981] text-[#050505] text-xs flex items-center gap-1 w-max font-bold uppercase">
                              <XSquare className="w-3 h-3" /> Blocked
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
