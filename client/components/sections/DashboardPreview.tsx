"use client";

import { motion } from "framer-motion";
import { ShieldAlert, Activity, Globe, Mail, AlertTriangle, ShieldCheck } from "lucide-react";

export default function DashboardPreview() {
  return (
    <section id="dashboard" className="py-24 relative z-10 bg-black">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl md:text-5xl font-bold mb-6 text-white"
          >
            Enterprise <span className="text-gray-400">SOC Dashboard</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 text-lg"
          >
            Real-time visibility into your organization&apos;s email security posture.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="glass-card rounded-3xl border border-white/[0.06] overflow-hidden"
        >
          <div className="bg-black border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
              <span className="font-mono text-sm text-gray-400">LIVE THREAT FEED</span>
            </div>
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-3 h-3 rounded-full bg-white/10" />
              ))}
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-black">
            <div className="space-y-6">
              <div className="glass p-6 rounded-2xl border border-white/[0.06]">
                <h3 className="text-gray-500 text-sm font-medium mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Global Risk Score
                </h3>
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="64" cy="64" r="56" className="stroke-white/10" strokeWidth="12" fill="none" />
                      <motion.circle
                        cx="64" cy="64" r="56"
                        className="stroke-white/50"
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
                <div className="text-center mt-4 text-gray-400 text-sm font-medium">HIGH RISK</div>
              </div>

              <div className="glass p-6 rounded-2xl border border-white/[0.06]">
                <h3 className="text-gray-500 text-sm font-medium mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Top Attack Origins
                </h3>
                <div className="space-y-4">
                  {[
                    { country: "Russia", percent: 45 },
                    { country: "China", percent: 30 },
                    { country: "North Korea", percent: 15 },
                    { country: "Unknown", percent: 10 },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{item.country}</span>
                        <span className="text-gray-600">{item.percent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-white/30"
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

            <div className="lg:col-span-2 space-y-6">
              <div className="glass p-6 rounded-2xl border border-white/[0.06] h-64 flex flex-col">
                <h3 className="text-gray-500 text-sm font-medium mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Threat Activity (Last 24h)
                </h3>
                <div className="flex-1 flex items-end gap-2">
                  {[42, 38, 55, 48, 62, 71, 65, 58, 82, 91, 88, 76, 69, 74, 85, 92, 98, 87, 79, 83, 95, 88, 76, 69].map((height, i) => (
                    <motion.div
                      key={i}
                      className={`flex-1 rounded-t-sm ${height > 85 ? "bg-white/40" : "bg-white/15"}`}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${height}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                    />
                  ))}
                </div>
              </div>

              <div className="glass p-6 rounded-2xl border border-white/[0.06]">
                <h3 className="text-gray-500 text-sm font-medium mb-4 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Recent Blocked Emails
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-gray-600 border-b border-white/[0.06]">
                        <th className="pb-3 font-medium">Time</th>
                        <th className="pb-3 font-medium">Sender</th>
                        <th className="pb-3 font-medium">Subject</th>
                        <th className="pb-3 font-medium">Threat Type</th>
                        <th className="pb-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-400">
                      {[
                        { time: "10:42 AM", sender: "admin@paypaI.com", subject: "Account Suspended", type: "Phishing" },
                        { time: "10:38 AM", sender: "hr@company-portal.net", subject: "Q3 Bonus Document", type: "Malware (PDF)" },
                        { time: "10:15 AM", sender: "support@microsoft-update.com", subject: "Action Required", type: "Spoofing" },
                        { time: "09:55 AM", sender: "unknown@192.168.x.x", subject: "Invoice #9921", type: "Malicious URL" },
                      ].map((row, i) => (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: i * 0.1 }}
                          className="border-b border-white/[0.04] last:border-0"
                        >
                          <td className="py-3 text-gray-600">{row.time}</td>
                          <td className="py-3 text-gray-300">{row.sender}</td>
                          <td className="py-3 truncate max-w-[150px]">{row.subject}</td>
                          <td className="py-3 text-gray-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {row.type}
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-1 bg-white/[0.06] text-gray-300 rounded text-xs flex items-center gap-1 w-max border border-white/[0.06]">
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
