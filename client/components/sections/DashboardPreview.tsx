"use client";

import { motion } from "framer-motion";
import { ShieldAlert, Activity, Globe, Mail, AlertTriangle, ShieldCheck } from "lucide-react";

export default function DashboardPreview() {
  return (
    <section id="dashboard" className="py-24 relative z-10">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl md:text-5xl font-bold mb-6"
          >
            Enterprise <span className="text-gradient-blue">SOC Dashboard</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 text-lg"
          >
            Real-time visibility into your organization's email security posture.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]"
        >
          {/* Dashboard Header */}
          <div className="bg-black/60 border-b border-white/5 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono text-sm text-gray-300">LIVE THREAT FEED</span>
            </div>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-white/20" />
              <div className="w-3 h-3 rounded-full bg-white/20" />
              <div className="w-3 h-3 rounded-full bg-white/20" />
            </div>
          </div>

          {/* Dashboard Grid */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-[#0a0a0a]/80">
            
            {/* Left Column */}
            <div className="space-y-6">
              {/* Risk Score */}
              <div className="glass p-6 rounded-2xl border border-white/5">
                <h3 className="text-gray-400 text-sm font-medium mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Global Risk Score
                </h3>
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="56" className="stroke-white/10" strokeWidth="12" fill="none" />
                      <motion.circle 
                        cx="64" cy="64" r="56" 
                        className="stroke-red-500" 
                        strokeWidth="12" fill="none" 
                        strokeDasharray="351"
                        initial={{ strokeDashoffset: 351 }}
                        whileInView={{ strokeDashoffset: 351 - (351 * 0.78) }}
                        viewport={{ once: true }}
                        transition={{ duration: 2, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute text-3xl font-bold text-white">78</div>
                  </div>
                </div>
                <div className="text-center mt-4 text-red-400 text-sm font-medium">HIGH RISK</div>
              </div>

              {/* Top Attack Countries */}
              <div className="glass p-6 rounded-2xl border border-white/5">
                <h3 className="text-gray-400 text-sm font-medium mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Top Attack Origins
                </h3>
                <div className="space-y-4">
                  {[
                    { country: "Russia", percent: 45, color: "bg-red-500" },
                    { country: "China", percent: 30, color: "bg-orange-500" },
                    { country: "North Korea", percent: 15, color: "bg-yellow-500" },
                    { country: "Unknown", percent: 10, color: "bg-gray-500" },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300">{item.country}</span>
                        <span className="text-gray-500">{item.percent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          className={`h-full ${item.color}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${item.percent}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: i * 0.2 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Threat Activity Chart */}
              <div className="glass p-6 rounded-2xl border border-white/5 h-64 flex flex-col">
                <h3 className="text-gray-400 text-sm font-medium mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Threat Activity (Last 24h)
                </h3>
                <div className="flex-1 flex items-end gap-2">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const height = Math.random() * 100;
                    const isHigh = height > 80;
                    return (
                      <motion.div
                        key={i}
                        className={`flex-1 rounded-t-sm ${isHigh ? 'bg-red-500/80' : 'bg-blue-500/50'}`}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Recent Threats Table */}
              <div className="glass p-6 rounded-2xl border border-white/5">
                <h3 className="text-gray-400 text-sm font-medium mb-4 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Recent Blocked Emails
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-gray-500 border-b border-white/10">
                        <th className="pb-3 font-medium">Time</th>
                        <th className="pb-3 font-medium">Sender</th>
                        <th className="pb-3 font-medium">Subject</th>
                        <th className="pb-3 font-medium">Threat Type</th>
                        <th className="pb-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      {[
                        { time: "10:42 AM", sender: "admin@paypaI.com", subject: "Account Suspended", type: "Phishing", color: "text-red-400" },
                        { time: "10:38 AM", sender: "hr@company-portal.net", subject: "Q3 Bonus Document", type: "Malware (PDF)", color: "text-orange-400" },
                        { time: "10:15 AM", sender: "support@microsoft-update.com", subject: "Action Required", type: "Spoofing", color: "text-purple-400" },
                        { time: "09:55 AM", sender: "unknown@192.168.x.x", subject: "Invoice #9921", type: "Malicious URL", color: "text-red-400" },
                      ].map((row, i) => (
                        <motion.tr 
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: i * 0.1 }}
                          className="border-b border-white/5 last:border-0"
                        >
                          <td className="py-3 text-gray-500">{row.time}</td>
                          <td className="py-3">{row.sender}</td>
                          <td className="py-3 truncate max-w-[150px]">{row.subject}</td>
                          <td className={`py-3 ${row.color} flex items-center gap-1`}>
                            <AlertTriangle className="w-3 h-3" /> {row.type}
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs flex items-center gap-1 w-max">
                              <ShieldCheck className="w-3 h-3" /> Blocked
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
