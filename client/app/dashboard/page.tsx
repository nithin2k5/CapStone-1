"use client";

import { motion } from "framer-motion";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SecurityScore } from "@/components/dashboard/SecurityScore";
import { ThreatOverview } from "@/components/dashboard/ThreatOverview";
import { RecentEmails } from "@/components/dashboard/RecentEmails";
import { RiskBreakdown } from "@/components/dashboard/RiskBreakdown";
import { RecentThreats } from "@/components/dashboard/RecentThreats";
import { Mail, ShieldAlert, AlertTriangle, ShieldCheck, ScanLine, FileDown } from "lucide-react";
import { useEffect, useState } from "react";
import { getDashboardStats, DashboardData, downloadReport } from "@/lib/api";
import { ScanModal } from "@/components/dashboard/ScanModal";
import { useLiveRefresh } from "@/lib/useLiveRefresh";
import { useAuthSession } from "@/lib/useAuthSession";

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as const },
});

function greetingFor(date: Date | null) {
  if (!date) return "Welcome back";
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  // Stamped when stats arrive, so the time shown is real and SSR stays stable.
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const session = useAuthSession();

  const loadStats = () => {
    getDashboardStats()
      .then((data) => {
        setStats(data);
        setUpdatedAt(new Date());
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadStats();
  }, []);
  useLiveRefresh(loadStats);

  const scanned = stats?.scanned_emails ?? 0;
  const share = (n?: number) => (stats && scanned > 0 ? (n ?? 0) / scanned : 0);
  const firstName = session?.name?.split(" ")[0];

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ScanModal
        isOpen={isScanModalOpen}
        onClose={() => {
          setIsScanModalOpen(false);
          loadStats(); // Reload stats when modal closes
        }}
      />

      {/* Command bar */}
      <motion.div
        {...rise(0)}
        className="panel brackets relative flex flex-col justify-between gap-5 overflow-hidden p-6 md:flex-row md:items-center"
      >
        <div className="hex-bg pointer-events-none absolute inset-0 opacity-70" />
        <div
          className="pointer-events-none absolute -left-20 -top-24 h-64 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--accent-solid)" }}
        />
        <div className="relative">
          <span className="eyebrow">
            <span className="h-px w-6 bg-accent" />
            security operations
          </span>
          <h2 className="display mt-3 text-[1.6rem] text-foreground sm:text-[1.9rem]">
            {greetingFor(updatedAt)}
            {firstName ? `, ${firstName}` : ""}.
          </h2>
          <p className="mt-1.5 font-mono text-[12px] text-muted-foreground">
            {updatedAt
              ? `Telemetry refreshed ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · auto-refreshing`
              : "Loading telemetry…"}
          </p>
        </div>
        <div className="relative flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => setIsScanModalOpen(true)}
            className="btn-primary px-5 py-2.5 text-[13px]"
          >
            <ScanLine className="h-4 w-4" />
            Scan inbox now
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await downloadReport();
              } catch (e) {
                console.error(e);
              }
            }}
            className="btn-secondary px-5 py-2.5 text-[13px]"
          >
            <FileDown className="h-4 w-4" />
            Generate report
          </button>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <motion.div {...rise(0.05)}>
          <MetricCard
            title="Emails scanned"
            value={stats ? stats.scanned_emails : null}
            share={stats ? 1 : 0}
            icon={Mail}
            description="Total volume"
            tone="accent"
          />
        </motion.div>
        <motion.div {...rise(0.1)}>
          <MetricCard
            title="Threats blocked"
            value={stats ? stats.blocked_emails : null}
            share={share(stats?.blocked_emails)}
            icon={ShieldAlert}
            description="Malicious emails"
            tone="danger"
          />
        </motion.div>
        <motion.div {...rise(0.15)}>
          <MetricCard
            title="Suspicious"
            value={stats ? stats.quarantined_emails : null}
            share={share(stats?.quarantined_emails)}
            icon={AlertTriangle}
            description="Quarantined"
            tone="warning"
          />
        </motion.div>
        <motion.div {...rise(0.2)}>
          <MetricCard
            title="Safe deliveries"
            value={stats ? stats.safe_emails : null}
            share={share(stats?.safe_emails)}
            icon={ShieldCheck}
            description="Passed analysis"
            tone="success"
          />
        </motion.div>
      </div>

      {/* Score + activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div {...rise(0.25)}>
          <SecurityScore
            score={stats ? (stats.safe_emails / (stats.scanned_emails || 1)) * 100 : null}
          />
        </motion.div>
        <motion.div {...rise(0.3)} className="lg:col-span-2">
          <ThreatOverview data={stats?.monthly_statistics} />
        </motion.div>
      </div>

      {/* Distribution + threats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <motion.div {...rise(0.35)} className="lg:col-span-2">
          <RiskBreakdown distribution={stats?.risk_distribution} domains={stats?.top_domains} />
        </motion.div>
        <motion.div {...rise(0.4)} className="lg:col-span-3">
          <RecentThreats threats={stats?.recent_threats} />
        </motion.div>
      </div>

      <motion.div {...rise(0.45)}>
        <RecentEmails />
      </motion.div>
    </div>
  );
}
