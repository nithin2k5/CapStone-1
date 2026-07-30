"use client";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import EmailQueueTable from "@/components/dashboard/EmailQueue";

export default function EmailsPage() {
  return (
    <>
      <DashboardHeader
        title="Email Queue"
        subtitle="Monitor incoming emails and scan status in real-time"
      />
      <EmailQueueTable />
    </>
  );
}
