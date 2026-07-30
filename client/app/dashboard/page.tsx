"use client";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatCard from "@/components/dashboard/StatCard";
import ThreatFeedTable, {
  ThreatActivityChart,
  RiskScoreGauge,
  AttackCountriesChart,
} from "@/components/dashboard/ThreatFeed";
import { BlockedDomainsList } from "@/components/dashboard/BlockedDomains";
import { Mail, ShieldAlert, Bug, Link2, Target, Inbox } from "lucide-react";

export default function DashboardPage() {
  return (
    <>
      <DashboardHeader
        title="Security Overview"
        subtitle="Real-time monitoring of your email security posture"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 mb-8">
        <StatCard label="Emails Protected" value="2.5M+" change="+12.4%" icon={Mail} delay={0} />
        <StatCard label="Threats Blocked" value="195K" change="+8.2%" icon={ShieldAlert} delay={0.05} />
        <StatCard label="Malware Detected" value="18K" change="-3.1%" icon={Bug} delay={0.1} />
        <StatCard label="Malicious URLs" value="420K" change="+15.7%" icon={Link2} delay={0.15} />
        <StatCard label="Detection Accuracy" value="99.4%" change="+0.2%" icon={Target} delay={0.2} />
        <StatCard label="Queue Size" value="847" change="Live" icon={Inbox} delay={0.25} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <ThreatActivityChart />
        </div>
        <RiskScoreGauge score={78} />
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
