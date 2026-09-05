"use client";

import { motion } from "framer-motion";
import { ThreatCard } from "@/components/security/ThreatCard";

import { useEffect, useState } from "react";
import { getDashboardStats, RecentThreat } from "@/lib/api";
export default function ThreatsPage() {
  const [threats, setThreats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchThreats() {
      try {
        const stats = await getDashboardStats();
        if (stats?.recent_threats) {
          const formatted = stats.recent_threats.map((t: RecentThreat) => ({
            id: t.email_id,
            severity: t.risk_level.toUpperCase() as any,
            type: t.subject || "Unknown Threat",
            source: t.sender,
            time: t.received_at ? new Date(t.received_at).toLocaleTimeString() : "Unknown",
            actionTaken: t.risk_score > 80 ? "BLOCKED" : "QUARANTINED"
          }));
          setThreats(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch threats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchThreats();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Threat Intelligence</h1>
          <p className="text-sm text-muted-foreground">Live feed of malicious activity detected and mitigated by the gateway.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {threats.length === 0 && !loading && (
          <div className="col-span-full text-center text-muted-foreground py-8">No threats detected.</div>
        )}
        {threats.map((threat, i) => (
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
