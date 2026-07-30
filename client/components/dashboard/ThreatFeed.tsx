"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import { threatFeed, type ThreatLevel } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const levelStyles: Record<ThreatLevel, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const actionStyles = {
  blocked: "text-green-400",
  quarantined: "text-yellow-400",
  flagged: "text-orange-400",
};

type ThreatFeedProps = {
  limit?: number;
  showHeader?: boolean;
};

export default function ThreatFeedTable({ limit, showHeader = true }: ThreatFeedProps) {
  const threats = limit ? threatFeed.slice(0, limit) : threatFeed;

  return (
    <div className="glass-card rounded-2xl border border-white/[0.05] overflow-hidden">
      {showHeader && (
        <div className="px-6 py-4 border-b border-white/[0.05] flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h3 className="font-medium text-white">Live Threat Feed</h3>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-white/[0.05]">
              <th className="px-6 py-3 font-medium">ID</th>
              <th className="px-6 py-3 font-medium">Time</th>
              <th className="px-6 py-3 font-medium">Sender</th>
              <th className="px-6 py-3 font-medium hidden md:table-cell">Subject</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Level</th>
              <th className="px-6 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {threats.map((threat, i) => (
              <motion.tr
                key={threat.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-6 py-4 font-mono text-gray-500 text-xs">{threat.id}</td>
                <td className="px-6 py-4 text-gray-400">{threat.time}</td>
                <td className="px-6 py-4 text-white">{threat.sender}</td>
                <td className="px-6 py-4 text-gray-300 hidden md:table-cell max-w-[200px] truncate">
                  {threat.subject}
                </td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    {threat.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
                      levelStyles[threat.level]
                    )}
                  >
                    {threat.level}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "flex items-center gap-1.5 capitalize text-xs font-medium",
                      actionStyles[threat.action]
                    )}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {threat.action}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ThreatActivityChart() {
  return (
    <div className="glass-card rounded-2xl p-6 border border-white/[0.05] h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <ShieldAlert className="w-5 h-5 text-red-400" />
        <h3 className="font-medium text-white">Threat Activity (24h)</h3>
      </div>
      <div className="flex-1 flex items-end gap-1 min-h-[180px]">
        {[42, 38, 55, 48, 62, 71, 65, 58, 82, 91, 88, 76, 69, 74, 85, 92, 98, 87, 79, 83, 95, 102, 88, 76].map(
          (height, i) => {
            const isHigh = height > 85;
            return (
              <motion.div
                key={i}
                className={cn(
                  "flex-1 rounded-t-sm min-w-[4px]",
                  isHigh ? "bg-red-500/70" : "bg-blue-500/40"
                )}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
              />
            );
          }
        )}
      </div>
    </div>
  );
}

export function RiskScoreGauge({ score = 78 }: { score?: number }) {
  return (
    <div className="glass-card rounded-2xl p-6 border border-white/[0.05]">
      <h3 className="font-medium text-white mb-6">Global Risk Score</h3>
      <div className="flex items-center justify-center">
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle cx="72" cy="72" r="64" className="stroke-white/10" strokeWidth="10" fill="none" />
            <motion.circle
              cx="72"
              cy="72"
              r="64"
              className="stroke-red-500"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={402}
              initial={{ strokeDashoffset: 402 }}
              animate={{ strokeDashoffset: 402 - (402 * score) / 100 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute text-4xl font-bold text-white">{score}</div>
        </div>
      </div>
      <div className="text-center mt-4">
        <span className="text-red-400 text-sm font-medium">HIGH RISK</span>
      </div>
    </div>
  );
}

export function AttackCountriesChart() {
  const countries = [
    { country: "Russia", percent: 34, color: "bg-red-500" },
    { country: "China", percent: 22, color: "bg-orange-500" },
    { country: "North Korea", percent: 14, color: "bg-yellow-500" },
    { country: "Romania", percent: 11, color: "bg-purple-500" },
    { country: "Unknown", percent: 19, color: "bg-gray-500" },
  ];

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/[0.05]">
      <h3 className="font-medium text-white mb-6">Top Attack Origins</h3>
      <div className="space-y-4">
        {countries.map((item, i) => (
          <div key={item.country}>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-300">{item.country}</span>
              <span className="text-gray-500">{item.percent}%</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", item.color)}
                initial={{ width: 0 }}
                animate={{ width: `${item.percent}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
