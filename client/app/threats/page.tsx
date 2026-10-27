"use client";

import { motion } from "framer-motion";
import { ThreatCard, Severity, severityColor } from "@/components/security/ThreatCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Radar, Globe, AtSign } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { getDashboardStats, DashboardData, RecentThreat } from "@/lib/api";
import { useLiveRefresh } from "@/lib/useLiveRefresh";

type ThreatRow = {
  id: string;
  severity: Severity;
  type: string;
  source: string;
  time: string;
  score: number;
};

// The API's risk levels and the card's severities are not the same set: a
// "safe" message has no severity to show, so it enters at the bottom of the
// scale rather than as an uppercased string the card does not recognise.
const SEVERITY: Record<RecentThreat["risk_level"], Severity> = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
  safe: "LOW",
};

const ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function RankedList({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: typeof Globe;
  rows: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <GlassCard className="p-5">
      <h3 className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-accent" />
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-[13px] text-muted-foreground">Nothing recorded yet.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {rows.slice(0, 6).map((r, i) => (
            <li key={r.label}>
              <div className="flex items-baseline gap-2.5">
                <span className="w-4 font-mono text-[10.5px] text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-foreground">{r.label}</span>
                <span className="font-mono text-[11.5px] text-accent">{r.count}</span>
              </div>
              <div className="ml-6 mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${(r.count / max) * 100}%` }}
                  transition={{ duration: 0.7, delay: i * 0.05 }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </GlassCard>
  );
}

export default function ThreatsPage() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Severity | "ALL">("ALL");

  const fetchThreats = useCallback(async () => {
    try {
      setStats(await getDashboardStats());
    } catch (err) {
      console.error("Failed to fetch threats", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useLiveRefresh(fetchThreats, { immediate: true });

  const threats: ThreatRow[] = useMemo(
    () =>
      (stats?.recent_threats ?? []).map((t) => ({
        id: t.email_id,
        severity: SEVERITY[t.risk_level] ?? "LOW",
        type: t.subject || "Unknown Threat",
        source: t.sender,
        time: t.received_at ? new Date(t.received_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Unknown",
        score: t.risk_score,
      })),
    [stats]
  );

  const counts = useMemo(
    () => Object.fromEntries(ORDER.map((s) => [s, threats.filter((t) => t.severity === s).length])) as Record<Severity, number>,
    [threats]
  );
  const visible = filter === "ALL" ? threats : threats.filter((t) => t.severity === filter);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <span className="eyebrow">
          <span className="h-px w-6 bg-accent" />
          threat intelligence
        </span>
        <h2 className="display mt-3 text-[1.7rem] text-foreground">Live threat feed</h2>
        <p className="mt-1.5 max-w-2xl text-[14px] text-muted-foreground">
          Malicious and suspicious mail the gateway has caught, newest first, with
          the senders and domains it keeps coming from.
        </p>
      </div>

      {/* Severity strip doubles as the filter */}
      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
            severity breakdown · {threats.length} recent
          </span>
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`font-mono text-[11px] uppercase tracking-wider transition-colors ${filter === "ALL" ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}
          >
            show all
          </button>
        </div>
        <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-secondary">
          {threats.length > 0 &&
            ORDER.map((s) =>
              counts[s] > 0 ? (
                <motion.div
                  key={s}
                  initial={{ width: 0 }}
                  animate={{ width: `${(counts[s] / threats.length) * 100}%` }}
                  transition={{ duration: 0.8 }}
                  style={{ background: severityColor[s] }}
                />
              ) : null
            )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(filter === s ? "ALL" : s)}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${filter === s ? "border-accent/50 bg-accent-subtle" : "border-border hover:border-border-strong"}`}
            >
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: severityColor[s] }} />
                {s}
              </div>
              <div className="display mt-1 text-[1.35rem] leading-none" style={{ color: severityColor[s] }}>
                {loading ? "—" : counts[s]}
              </div>
            </button>
          ))}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-card/60" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Radar}
              title={threats.length === 0 ? "No threats detected" : "None at this severity"}
              description={
                threats.length === 0
                  ? "The gateway is watching. Malicious mail will appear here as it is caught."
                  : "Pick another severity, or show all."
              }
            />
          ) : (
            <div>
              {visible.map((threat, i) => (
                <motion.div
                  key={threat.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i, 10) * 0.04 }}
                >
                  <ThreatCard {...threat} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <RankedList
            title="top sender domains"
            icon={Globe}
            rows={(stats?.top_domains ?? []).map((d) => ({ label: d.domain, count: d.count }))}
          />
          <RankedList
            title="top senders"
            icon={AtSign}
            rows={(stats?.top_senders ?? []).map((s) => ({ label: s.sender, count: s.count }))}
          />
        </div>
      </div>
    </div>
  );
}
