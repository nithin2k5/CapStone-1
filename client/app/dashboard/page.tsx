"use client";

import { motion } from "framer-motion";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SecurityScore } from "@/components/dashboard/SecurityScore";
import { ThreatOverview } from "@/components/dashboard/ThreatOverview";
import { RecentEmails } from "@/components/dashboard/RecentEmails";
import { Mail, ShieldAlert, AlertTriangle, ShieldCheck } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8 pb-12">
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
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl border border-white/10 transition-colors">
            Generate Report
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <MetricCard
            title="Emails Scanned"
            value="12,482"
            trend="12.4% from last week"
            trendUp={true}
            icon={Mail}
            description="Total volume"
            color="blue"
          />
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}>
          <MetricCard
            title="Threats Blocked"
            value="327"
            trend="4.2% from last week"
            trendUp={false}
            icon={ShieldAlert}
            description="Malicious emails"
            color="red"
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <MetricCard
            title="Suspicious"
            value="42"
            trend="1.1% from last week"
            trendUp={true}
            icon={AlertTriangle}
            description="Quarantined"
            color="amber"
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}>
          <MetricCard
            title="Safe Deliveries"
            value="12,113"
            trend="13.2% from last week"
            trendUp={true}
            icon={ShieldCheck}
            description="Passed analysis"
            color="emerald"
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <SecurityScore score={98.7} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.30 }} className="col-span-1 lg:col-span-2">
          <ThreatOverview />
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <RecentEmails />
      </motion.div>
    </div>
  );
}
