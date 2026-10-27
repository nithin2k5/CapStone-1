"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { DashboardData } from "@/lib/api";

type MonthlyPoint = DashboardData["monthly_statistics"][number];

export function ThreatOverview({ data }: { data?: MonthlyPoint[] }) {
  const chartData =
    data && data.length > 0
      ? data.map((d) => ({ time: d.month, clean: d.safe, threats: d.blocked }))
      : [{ time: "—", clean: 0, threats: 0 }];

  const legend = [
    { label: "Safe", color: "var(--success)" },
    { label: "Blocked", color: "var(--danger)" },
  ];

  return (
    <GlassCard className="flex h-full flex-col overflow-hidden p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
            threat activity
          </h3>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Safe and blocked mail per month.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: l.color, boxShadow: `0 0 8px ${l.color}` }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 h-[260px] w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="fillClean" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--success)" stopOpacity={0.22} />
                <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillThreats" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--danger)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
            />
            <Tooltip
              cursor={{ stroke: "var(--accent)", strokeOpacity: 0.4 }}
              contentStyle={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }}
              itemStyle={{ color: "var(--foreground)" }}
            />
            <Area type="monotone" dataKey="clean" name="Safe" stroke="var(--success)" strokeWidth={2} fill="url(#fillClean)" />
            <Area type="monotone" dataKey="threats" name="Blocked" stroke="var(--danger)" strokeWidth={2} fill="url(#fillThreats)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
