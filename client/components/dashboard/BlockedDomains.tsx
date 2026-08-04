"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getDashboardStats, type TopDomain } from "@/lib/api";
import { Globe, Ban, Loader2, ShieldCheck } from "lucide-react";

export default function BlockedDomainsTable() {
  const [domains, setDomains] = useState<TopDomain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then((data) => setDomains(data.top_domains || []))
      .catch(() => setDomains([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
        <Globe className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-white">Blocked & Monitored Domains</h3>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          Loading domain activity...
        </div>
      ) : domains.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center text-gray-500 px-4">
          <ShieldCheck className="w-10 h-10 mb-2 text-gray-600 stroke-[1.5]" />
          <p className="text-gray-300 font-medium">No malicious domain hits recorded</p>
          <p className="text-xs max-w-sm text-gray-600 mt-1">
            Domains associated with scanned emails and blocked phishing attempts will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-600 border-b border-white/[0.06]">
                <th className="px-6 py-3 font-medium">Domain</th>
                <th className="px-6 py-3 font-medium">Classification</th>
                <th className="px-6 py-3 font-medium">Email Hits</th>
                <th className="px-6 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d, i) => (
                <motion.tr
                  key={d.domain}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4 font-mono text-gray-300">{d.domain}</td>
                  <td className="px-6 py-4 text-amber-400/80 text-xs">Suspicious Activity</td>
                  <td className="px-6 py-4 text-white font-medium">{d.count.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors">
                      <Ban className="w-3.5 h-3.5" />
                      Block Policy
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function BlockedDomainsList() {
  const [domains, setDomains] = useState<TopDomain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then((data) => setDomains(data.top_domains || []))
      .catch(() => setDomains([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/[0.06]">
      <h3 className="font-medium text-white mb-4">Top Observed Domains</h3>
      {loading ? (
        <div className="py-6 flex justify-center text-gray-500 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      ) : domains.length === 0 ? (
        <div className="py-6 text-center text-xs text-gray-500">
          No domains tracked yet.
        </div>
      ) : (
        <div className="space-y-3">
          {domains.slice(0, 5).map((d, i) => (
            <motion.div
              key={d.domain}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
            >
              <div>
                <div className="font-mono text-sm text-gray-300">{d.domain}</div>
                <div className="text-xs text-gray-500">Monitored origin</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-white">{d.count}</div>
                <div className="text-xs text-gray-600">hits</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
