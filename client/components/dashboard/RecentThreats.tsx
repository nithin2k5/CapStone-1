"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldAlert, ArrowUpRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import type { RecentThreat } from "@/lib/api";

function levelColor(level: RecentThreat["risk_level"]) {
  if (level === "critical" || level === "high") return "var(--danger)";
  if (level === "medium") return "var(--warning)";
  return "var(--accent)";
}

export function RecentThreats({ threats }: { threats?: RecentThreat[] }) {
  const items = (threats ?? []).slice(0, 6);

  return (
    <GlassCard className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
          recent threats
        </h3>
        <Link
          href="/threats"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-accent transition-colors hover:text-accent-hover"
        >
          All threats <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <ShieldAlert className="h-7 w-7 text-[var(--success)]" />
          <p className="mt-3 text-[13px] text-muted-foreground">No threats detected.</p>
        </div>
      ) : (
        <ul className="mt-4 -mx-2 flex-1 space-y-1">
          {items.map((t, i) => {
            const color = levelColor(t.risk_level);
            return (
              <motion.li
                key={t.email_id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/emails/${t.email_id}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border font-mono text-[12px] font-bold"
                    style={{
                      color,
                      borderColor: `color-mix(in srgb, ${color} 35%, var(--border))`,
                      background: `color-mix(in srgb, ${color} 10%, transparent)`,
                    }}
                  >
                    {Math.round(t.risk_score)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-foreground">
                      {t.subject || "No subject"}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                      {t.sender}
                    </span>
                  </span>
                  <span
                    className="font-mono text-[10px] uppercase tracking-wider"
                    style={{ color }}
                  >
                    {t.risk_level}
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
