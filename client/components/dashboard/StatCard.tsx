"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  color: string;
  delay?: number;
};

export default function StatCard({
  label,
  value,
  change,
  trend = "neutral",
  icon: Icon,
  color,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card rounded-2xl p-6 border border-white/[0.05] hover:border-white/10 transition-colors group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", color)}>
          <Icon className="w-6 h-6" />
        </div>
        {change && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              trend === "up" && "bg-green-500/10 text-green-400",
              trend === "down" && "bg-red-500/10 text-red-400",
              trend === "neutral" && "bg-gray-500/10 text-gray-400"
            )}
          >
            {change}
          </span>
        )}
      </div>
      <div className="font-heading text-3xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
        {value}
      </div>
      <div className="text-sm text-gray-500">{label}</div>
    </motion.div>
  );
}
