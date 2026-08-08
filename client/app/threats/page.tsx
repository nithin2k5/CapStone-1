"use client";

import { motion } from "framer-motion";
import { ThreatCard } from "@/components/security/ThreatCard";

const mockThreats = [
  { id: "1", severity: "CRITICAL" as const, type: "Credential Phishing", source: "alerts@microsoft-security-verify.com", time: "4 minutes ago", actionTaken: "BLOCKED" as const },
  { id: "2", severity: "HIGH" as const, type: "Malicious Attachment (Macro)", source: "hr@acme-corp.net", time: "15 minutes ago", actionTaken: "QUARANTINED" as const },
  { id: "3", severity: "CRITICAL" as const, type: "Spear Phishing", source: "ceo.name.imposter@gmail.com", time: "2 hours ago", actionTaken: "BLOCKED" as const },
  { id: "4", severity: "HIGH" as const, type: "Drive-by Download Link", source: "support@pay-pal-secure.com", time: "3 hours ago", actionTaken: "BLOCKED" as const },
  { id: "5", severity: "MEDIUM" as const, type: "Spoofed Sender Domain", source: "admin@it-support-desk.com", time: "5 hours ago", actionTaken: "QUARANTINED" as const },
  { id: "6", severity: "MEDIUM" as const, type: "Suspicious PDF payload", source: "invoice@billing-department-update.com", time: "6 hours ago", actionTaken: "QUARANTINED" as const },
];

export default function ThreatsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white mb-2">Threat Intelligence</h1>
          <p className="text-sm text-gray-400">Live feed of malicious activity detected and mitigated by the gateway.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mockThreats.map((threat, i) => (
          <motion.div
            key={threat.id}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <ThreatCard {...threat} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
