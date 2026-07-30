"use client";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import BlockedDomainsTable from "@/components/dashboard/BlockedDomains";

export default function DomainsPage() {
  return (
    <>
      <DashboardHeader
        title="Blocked Domains"
        subtitle="Manage and monitor malicious domain blocklist"
      />
      <BlockedDomainsTable />
    </>
  );
}
