"use client";

import { motion } from "framer-motion";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SecurityScore } from "@/components/dashboard/SecurityScore";
import { ThreatOverview } from "@/components/dashboard/ThreatOverview";
import { RecentEmails } from "@/components/dashboard/RecentEmails";
import { Mail, ShieldAlert, AlertTriangle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getDashboardStats, DashboardData } from "@/lib/api";
import { ScanModal } from "@/components/dashboard/ScanModal";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  const loadStats = () => {
    getDashboardStats().then(setStats).catch(console.error);
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="flex flex-col gap-8 pb-12">
      <ScanModal 
        isOpen={isScanModalOpen} 
        onClose={() => {
          setIsScanModalOpen(false);
          loadStats(); // Reload stats when modal closes
        }} 
      />

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02] border border-white/5 p-6 rounded-2xl"
      >
        <div>
          <h2 className="text-lg font-heading font-medium text-white mb-1">
            Good evening, Admin
          </h2>
          <p className="text-sm text-gray-400">
            Your email environment is secure. Last scan: 2 minutes ago
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsScanModalOpen(true)}
            className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm font-medium rounded-xl border border-indigo-500/30 transition-colors flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Scan Inbox Now
          </button>
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl border border-white/10 transition-colors">
            Generate Report
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <MetricCard
            title="Emails Scanned"
            value={stats ? stats.scanned_emails.toLocaleString() : "..."}
            trend=""
            trendUp={true}
            icon={Mail}
            description="Total volume"
            color="blue"
          />
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}>
          <MetricCard
            title="Threats Blocked"
            value={stats ? stats.blocked_emails.toLocaleString() : "..."}
            trend=""
            trendUp={false}
            icon={ShieldAlert}
            description="Malicious emails"
            color="red"
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <MetricCard
            title="Suspicious"
            value={stats ? stats.quarantined_emails.toLocaleString() : "..."}
            trend=""
            trendUp={true}
            icon={AlertTriangle}
            description="Quarantined"
            color="amber"
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}>
          <MetricCard
            title="Safe Deliveries"
            value={stats ? stats.safe_emails.toLocaleString() : "..."}
            trend=""
            trendUp={true}
            icon={ShieldCheck}
            description="Passed analysis"
            color="emerald"
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <SecurityScore score={stats ? ((stats.safe_emails / (stats.scanned_emails || 1)) * 100) : 100} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.30 }} className="col-span-1 lg:col-span-2">
          <ThreatOverview data={stats?.monthly_statistics} />
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <RecentEmails />
      </motion.div>
    </div>
  );
}
