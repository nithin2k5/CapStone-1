"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import type { RiskDistribution, TopDomain } from "@/lib/api";

const levels: { key: keyof RiskDistribution; label: string; color: string }[] = [
  { key: "safe", label: "Safe", color: "var(--success)" },
  { key: "low", label: "Low", color: "var(--accent)" },
  { key: "medium", label: "Medium", color: "var(--warning)" },
  { key: "high", label: "High", color: "color-mix(in srgb, var(--danger) 70%, var(--warning))" },
  { key: "critical", label: "Critical", color: "var(--danger)" },
];

export function RiskBreakdown({
  distribution,
  domains,
}: {
  distribution?: RiskDistribution;
  domains?: TopDomain[];
}) {
  const total = distribution
    ? levels.reduce((sum, l) => sum + (distribution[l.key] ?? 0), 0)
    : 0;
  const topDomains = (domains ?? []).slice(0, 5);
  const maxDomain = Math.max(1, ...topDomains.map((d) => d.count));

  return (
    <GlassCard className="flex h-full flex-col p-6">
      <h3 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        risk distribution
      </h3>

      {/* One stacked bar, segment per level */}
      <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-secondary">
        {total > 0 &&
          levels.map((l, i) => {
            const pct = ((distribution?.[l.key] ?? 0) / total) * 100;
            return pct > 0 ? (
              <motion.div
                key={l.key}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                style={{ background: l.color }}
                title={`${l.label}: ${distribution?.[l.key]}`}
              />
            ) : null;
          })}
      </div>

      <dl className="mt-4 grid grid-cols-5 gap-2">
        {levels.map((l) => (
          <div key={l.key} className="min-w-0">
            <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: l.color }} />
              <span className="truncate">{l.label}</span>
            </dt>
            <dd className="display mt-1 text-[17px] text-foreground">
              {distribution ? (distribution[l.key] ?? 0).toLocaleString() : "—"}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 border-t border-border pt-5">
        <h4 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
          top sender domains
        </h4>
        {topDomains.length === 0 ? (
          <p className="mt-4 text-[13px] text-muted-foreground">No mail scanned yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {topDomains.map((d) => (
              <li key={d.domain}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-mono text-[12.5px] text-foreground">{d.domain}</span>
                  <span className="font-mono text-[11.5px] text-accent">{d.count}</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full rounded-full bg-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.count / maxDomain) * 100}%` }}
                    transition={{ duration: 0.7 }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </GlassCard>
  );
}
