"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityScoreProps {
  score: number;
}

export function SecurityScore({ score }: SecurityScoreProps) {
  let status = "SECURE";
  let colorClass = "text-emerald-400";
  let bgGlow = "bg-emerald-500";
  let Icon = ShieldCheck;

  if (score < 70) {
    status = "CRITICAL";
    colorClass = "text-red-400";
    bgGlow = "bg-red-500";
    Icon = AlertTriangle;
  } else if (score < 90) {
    status = "WARNING";
    colorClass = "text-amber-400";
    bgGlow = "bg-amber-500";
    Icon = ShieldAlert;
  }

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <GlassCard className="p-8 flex flex-col items-center justify-center relative overflow-hidden">
      <div className={cn("absolute inset-0 opacity-10 blur-3xl", bgGlow)} />

      <h3 className="text-sm font-medium text-gray-400 tracking-wide uppercase mb-6 relative z-10">
        Protection Score
      </h3>

      <div className="relative w-48 h-48 flex items-center justify-center mb-4 z-10">
        {/* Background track */}
        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-white/5"
          />
          {/* Animated progress circle */}
          <motion.circle
            cx="96"
            cy="96"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeLinecap="round"
            className={colorClass}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>

        <div className="flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-5xl font-heading font-bold text-white mb-1"
          >
            {score.toFixed(1)}
          </motion.div>
          <div className={cn("text-xs font-bold tracking-widest flex items-center gap-1.5", colorClass)}>
            <Icon className="w-3 h-3" />
            {status}
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500 text-center relative z-10">
        Based on real-time threat intelligence and policy configurations.
      </p>
    </GlassCard>
  );
}
