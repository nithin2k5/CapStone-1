"use client";

import { motion } from "framer-motion";
import { blockedDomains } from "@/lib/mock-data";
import { Globe, Ban } from "lucide-react";

export default function BlockedDomainsTable() {
  return (
    <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
        <Globe className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-white">Blocked Domains</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-gray-600 border-b border-white/[0.06]">
              <th className="px-6 py-3 font-medium">Domain</th>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 font-medium">Hits</th>
              <th className="px-6 py-3 font-medium">Last Seen</th>
              <th className="px-6 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {blockedDomains.map((domain, i) => (
              <motion.tr
                key={domain.domain}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-6 py-4 font-mono text-gray-300">{domain.domain}</td>
                <td className="px-6 py-4 text-gray-500">{domain.category}</td>
                <td className="px-6 py-4 text-white font-medium">{domain.hits.toLocaleString()}</td>
                <td className="px-6 py-4 text-gray-600">{domain.lastSeen}</td>
                <td className="px-6 py-4">
                  <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
                    <Ban className="w-3.5 h-3.5" />
                    Block
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BlockedDomainsList() {
  return (
    <div className="glass-card rounded-2xl p-6 border border-white/[0.06]">
      <h3 className="font-medium text-white mb-4">Top Blocked Domains</h3>
      <div className="space-y-3">
        {blockedDomains.slice(0, 5).map((domain, i) => (
          <motion.div
            key={domain.domain}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
          >
            <div>
              <div className="font-mono text-sm text-gray-300">{domain.domain}</div>
              <div className="text-xs text-gray-600">{domain.category}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-white">{domain.hits}</div>
              <div className="text-xs text-gray-600">hits</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
