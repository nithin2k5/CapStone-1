"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { getDashboardStats, DashboardData, RiskDistribution } from "@/lib/api";
import { useLiveRefresh } from "@/lib/useLiveRefresh";
import { Activity, PieChart as PieIcon, BarChart3, Globe } from "lucide-react";

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "var(--card)",
    borderColor: "var(--border)",
    borderRadius: 12,
    fontSize: 12,
  },
  labelStyle: { color: "var(--muted-foreground)", marginBottom: 4 },
  itemStyle: { color: "var(--foreground)" },
  cursor: { fill: "var(--accent-subtle)" },
};

const levels: { key: keyof RiskDistribution; label: string; color: string }[] = [
  { key: "safe", label: "Safe", color: "var(--success)" },
  { key: "low", label: "Low", color: "var(--accent)" },
  { key: "medium", label: "Medium", color: "var(--warning)" },
  { key: "high", label: "High", color: "color-mix(in srgb, var(--danger) 70%, var(--warning))" },
  { key: "critical", label: "Critical", color: "var(--danger)" },
];

function pct(n: number, d: number) {
  return d > 0 ? (n / d) * 100 : 0;
}

function Title({ icon: Icon, children }: { icon: typeof Activity; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-accent" />
      {children}
    </h3>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardData | null>(null);

  const load = useCallback(async () => {
    try {
      setStats(await getDashboardStats());
    } catch (err) {
      console.error("Failed to load analytics", err);
    }
  }, []);
  useLiveRefresh(load, { immediate: true });

  const scanned = stats?.scanned_emails ?? 0;
  const rates = [
    { label: "Pass rate", value: pct(stats?.safe_emails ?? 0, scanned), note: "Cleared every analyser", color: "var(--success)" },
    { label: "Block rate", value: pct(stats?.blocked_emails ?? 0, scanned), note: "Judged malicious", color: "var(--danger)" },
    { label: "Quarantine rate", value: pct(stats?.quarantined_emails ?? 0, scanned), note: "Held for review", color: "var(--warning)" },
    { label: "Coverage", value: pct(scanned, stats?.total_emails ?? 0), note: `${scanned.toLocaleString()} of ${(stats?.total_emails ?? 0).toLocaleString()} emails scanned`, color: "var(--accent)" },
  ];

  const monthly = (stats?.monthly_statistics ?? []).map((m) => ({
    month: m.month,
    safe: m.safe,
    blocked: m.blocked,
    other: Math.max(0, m.total - m.safe - m.blocked),
  }));

  const pie = levels
    .map((l) => ({ name: l.label, value: stats?.risk_distribution?.[l.key] ?? 0, color: l.color }))
    .filter((d) => d.value > 0);
  const pieTotal = pie.reduce((s, d) => s + d.value, 0);

  const domains = (stats?.top_domains ?? []).slice(0, 8);
  const maxDomain = Math.max(1, ...domains.map((d) => d.count));

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <span className="eyebrow">
          <span className="h-px w-6 bg-accent" />
          analytics
        </span>
        <h2 className="display mt-3 text-[1.7rem] text-foreground">Security analytics</h2>
        <p className="mt-1.5 max-w-2xl text-[14px] text-muted-foreground">
          How the gateway&rsquo;s verdicts break down over everything it has scanned.
        </p>
      </div>

      {/* Rates, computed from the counts rather than quoted */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rates.map((r, i) => (
          <motion.div
            key={r.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard className="overflow-hidden p-5">
              <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                {r.label}
              </div>
              <div className="display mt-2 text-[2rem] leading-none" style={{ color: r.color }}>
                {stats ? `${r.value.toFixed(1)}%` : "—"}
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: r.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${r.value}%` }}
                  transition={{ duration: 0.9 }}
                />
              </div>
              <div className="mt-2 text-[12px] text-muted-foreground">{r.note}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Monthly volume */}
        <GlassCard className="flex h-[400px] flex-col p-6 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Title icon={BarChart3}>monthly verdicts</Title>
            <div className="flex gap-4">
              {[
                { l: "Safe", c: "var(--success)" },
                { l: "Blocked", c: "var(--danger)" },
                { l: "Other", c: "var(--accent)" },
              ].map((x) => (
                <span key={x.l} className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <span className="h-2 w-2 rounded-sm" style={{ background: x.c }} />
                  {x.l}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-6 min-h-0 flex-1">
            {monthly.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
                No monthly data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="safe" name="Safe" stackId="a" fill="var(--success)" />
                  <Bar dataKey="blocked" name="Blocked" stackId="a" fill="var(--danger)" />
                  <Bar dataKey="other" name="Other" stackId="a" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>

        {/* Risk donut */}
        <GlassCard className="flex h-[400px] flex-col p-6 lg:col-span-2">
          <Title icon={PieIcon}>risk levels</Title>
          <div className="relative mt-2 min-h-0 flex-1">
            {pieTotal === 0 ? (
              <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
                No scanned mail yet.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pie} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="86%" paddingAngle={2} stroke="var(--card)" strokeWidth={2}>
                      {pie.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="display text-[1.8rem] leading-none text-foreground">{pieTotal.toLocaleString()}</span>
                  <span className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">scored</span>
                </div>
              </>
            )}
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1">
            {levels.map((l) => (
              <div key={l.key} className="text-center">
                <span className="mx-auto block h-1.5 w-6 rounded-full" style={{ background: l.color }} />
                <span className="mt-1 block font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <Title icon={Globe}>sender domains by volume</Title>
        {domains.length === 0 ? (
          <p className="mt-4 text-[13px] text-muted-foreground">No mail scanned yet.</p>
        ) : (
          <div className="mt-5 grid gap-x-10 gap-y-4 md:grid-cols-2">
            {domains.map((d, i) => (
              <div key={d.domain}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-mono text-[12.5px] text-foreground">{d.domain}</span>
                  <span className="font-mono text-[12px] text-accent">{d.count}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, var(--accent-solid), var(--accent-2))" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.count / maxDomain) * 100}%` }}
                    transition={{ duration: 0.8, delay: i * 0.04 }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
