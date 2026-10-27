"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";

interface SecurityScoreProps {
  /** Percentage of scanned mail that passed analysis; null while loading. */
  score: number | null;
}

export function SecurityScore({ score }: SecurityScoreProps) {
  const value = score ?? 0;

  let status = "SECURE";
  let color = "var(--success)";
  let Icon = ShieldCheck;
  if (value < 70) {
    status = "CRITICAL";
    color = "var(--danger)";
    Icon = AlertTriangle;
  } else if (value < 90) {
    status = "ELEVATED";
    color = "var(--warning)";
    Icon = ShieldAlert;
  }

  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <GlassCard className="flex h-full flex-col overflow-hidden p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
          protection score
        </h3>
        <span
          className="pill"
          style={{
            color,
            borderColor: `color-mix(in srgb, ${color} 30%, var(--border))`,
            background: `color-mix(in srgb, ${color} 10%, transparent)`,
          }}
        >
          <Icon className="h-3 w-3" />
          {score === null ? "…" : status}
        </span>
      </div>

      <div className="relative mx-auto my-6 flex h-52 w-52 items-center justify-center">
        {/* Radar sweep behind the dial */}
        <span
          className="animate-radar absolute inset-4 rounded-full opacity-50"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0 80%, color-mix(in srgb, var(--accent) 25%, transparent))",
          }}
        />
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full -rotate-90">
          {/* Tick ring */}
          <circle
            cx="100"
            cy="100"
            r="94"
            fill="none"
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="2 6"
          />
          <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--secondary)" strokeWidth="10" />
          <motion.circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="relative text-center">
          <div className="display text-[3rem] leading-none text-foreground">
            {score === null ? "—" : value.toFixed(1)}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            % mail passed
          </div>
        </div>
      </div>

      <p className="mt-auto text-center text-[12.5px] leading-relaxed text-muted-foreground">
        Share of scanned mail that cleared every analyser.
      </p>
    </GlassCard>
  );
}
