"use client";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ThreatFeedTable from "@/components/dashboard/ThreatFeed";

export default function ThreatsPage() {
  return (
    <>
      <DashboardHeader
        title="Threat Feed"
        subtitle="Live stream of detected and blocked email threats"
      />
      <ThreatFeedTable />
    </>
  );
}
