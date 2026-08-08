"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { motion } from "framer-motion";

const detectionData = [
  { day: "Mon", phish: 12, malware: 2, spam: 40 },
  { day: "Tue", phish: 8, malware: 1, spam: 35 },
  { day: "Wed", phish: 15, malware: 4, spam: 42 },
  { day: "Thu", phish: 22, malware: 7, spam: 55 },
  { day: "Fri", phish: 18, malware: 3, spam: 38 },
  { day: "Sat", phish: 5, malware: 0, spam: 20 },
  { day: "Sun", phish: 4, malware: 0, spam: 15 },
];

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white mb-2">Security Analytics</h1>
          <p className="text-sm text-gray-400">Deep dive into threat distribution and system performance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="p-6">
          <div className="text-sm font-medium text-gray-400 mb-2">Threat Detection Rate</div>
          <div className="text-3xl font-heading font-bold text-emerald-400">99.8%</div>
          <div className="text-xs text-gray-500 mt-2">Based on known signatures</div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="text-sm font-medium text-gray-400 mb-2">False Positive Rate</div>
          <div className="text-3xl font-heading font-bold text-indigo-400">0.02%</div>
          <div className="text-xs text-gray-500 mt-2">Manually released items</div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="text-sm font-medium text-gray-400 mb-2">Average Scan Time</div>
          <div className="text-3xl font-heading font-bold text-blue-400">42ms</div>
          <div className="text-xs text-gray-500 mt-2">Per email message</div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="text-sm font-medium text-gray-400 mb-2">Active Policies</div>
          <div className="text-3xl font-heading font-bold text-purple-400">128</div>
          <div className="text-xs text-gray-500 mt-2">Custom routing rules</div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6 h-[400px] flex flex-col">
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase mb-6">Threat Distribution (7D)</h3>
          <div className="flex-1 relative min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={detectionData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '13px' }}
                />
                <Bar dataKey="phish" name="Phishing" stackId="a" fill="#f87171" radius={[0, 0, 4, 4]} />
                <Bar dataKey="malware" name="Malware" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="spam" name="Spam" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6 h-[400px] flex flex-col">
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase mb-6">Top Targeted Users</h3>
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-4">
              {[
                { email: "ceo@company.com", count: 42, role: "Executive" },
                { email: "cfo@company.com", count: 38, role: "Executive" },
                { email: "admin@company.com", count: 25, role: "IT Admin" },
                { email: "hr@company.com", count: 19, role: "HR" },
                { email: "sales-lead@company.com", count: 12, role: "Sales" },
              ].map((user, i) => (
                <div key={user.email} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <div className="font-medium text-white text-sm">{user.email}</div>
                    <div className="text-xs text-gray-500 mt-1">{user.role}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(user.count / 42) * 100}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className="h-full bg-red-500" 
                      />
                    </div>
                    <span className="text-sm font-bold text-red-400 w-6 text-right">{user.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
