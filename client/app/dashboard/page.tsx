"use client";

import { useEffect, useState } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatCard from "@/components/dashboard/StatCard";
import ThreatFeedTable, {
  ThreatActivityChart,
  RiskScoreGauge,
  AttackCountriesChart,
} from "@/components/dashboard/ThreatFeed";
import { BlockedDomainsList } from "@/components/dashboard/BlockedDomains";
import { Mail, ShieldAlert, CheckCircle2, AlertTriangle, Activity, Inbox } from "lucide-react";
import { getDashboardStats, type DashboardData } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const total = stats?.total_emails || 0;
  const scanned = stats?.scanned_emails || 0;
  const blocked = stats?.blocked_emails || 0;
  const safe = stats?.safe_emails || 0;
  const quarantined = stats?.quarantined_emails || 0;
  const queue = Math.max(0, total - scanned);
  const accuracy = total > 0 ? ((scanned / total) * 100).toFixed(1) + "%" : "100%";

  return (
    <>
      <DashboardHeader
        title="Security Overview"
        subtitle="Real-time monitoring of your live Gmail security and phishing defense posture"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 mb-8">
        <StatCard label="Emails Protected" value={loading ? "..." : total.toLocaleString()} change="Live DB" icon={Mail} delay={0} />
        <StatCard label="Threats Blocked" value={loading ? "..." : blocked.toLocaleString()} change="Active" icon={ShieldAlert} delay={0.05} />
        <StatCard label="Verified Safe" value={loading ? "..." : safe.toLocaleString()} change="Clean" icon={CheckCircle2} delay={0.1} />
        <StatCard label="Quarantined" value={loading ? "..." : quarantined.toLocaleString()} change="Isolated" icon={AlertTriangle} delay={0.15} />
        <StatCard label="Scan Progress" value={loading ? "..." : accuracy} change="Engine" icon={Activity} delay={0.2} />
        <StatCard label="Pending Queue" value={loading ? "..." : queue.toString()} change="Real-time" icon={Inbox} delay={0.25} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <ThreatActivityChart />
        </div>
        <RiskScoreGauge />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="xl:col-span-2">
          <ThreatFeedTable limit={5} />
        </div>
        <div className="space-y-6">
          <AttackCountriesChart />
          <BlockedDomainsList />
        </div>
      </div>
    </>
  );
}
