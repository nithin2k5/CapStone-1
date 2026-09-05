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
  delay?: number;
};

export default function StatCard({
  label,
  value,
  change,
  trend = "neutral",
  icon: Icon,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card rounded-2xl p-6 border border-white/[0.06] hover:border-border transition-colors group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/[0.08] bg-white/[0.03] text-muted-foreground">
          <Icon className="w-6 h-6" />
        </div>
        {change && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/[0.04] text-muted-foreground border border-white/[0.06]">
            {change}
          </span>
        )}
      </div>
      <div className="font-heading text-3xl font-bold text-foreground mb-1 group-hover:text-gray-300 transition-colors">
        {value}
      </div>
      <div className="text-sm text-gray-600">{label}</div>
    </motion.div>
  );
}
