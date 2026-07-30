"use client";

import { motion } from "framer-motion";
import { emailQueue } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const statusStyles = {
  scanning: "bg-white/[0.06] text-gray-400 border-white/[0.08]",
  clean: "bg-white/[0.04] text-gray-500 border-white/[0.06]",
  blocked: "bg-white/10 text-white border-white/10",
  queued: "bg-white/[0.03] text-gray-600 border-white/[0.06]",
};

function getRiskColor(score: number) {
  if (score >= 80) return "text-white";
  if (score >= 50) return "text-gray-300";
  if (score >= 25) return "text-gray-500";
  return "text-gray-600";
}

export default function EmailQueueTable() {
  return (
    <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <h3 className="font-medium text-white">Email Processing Queue</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-gray-600 border-b border-white/[0.06]">
              <th className="px-6 py-3 font-medium">ID</th>
              <th className="px-6 py-3 font-medium">Sender</th>
              <th className="px-6 py-3 font-medium hidden lg:table-cell">Recipient</th>
              <th className="px-6 py-3 font-medium">Subject</th>
              <th className="px-6 py-3 font-medium">Risk</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {emailQueue.map((email, i) => (
              <motion.tr
                key={email.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-6 py-4 font-mono text-gray-600 text-xs">{email.id}</td>
                <td className="px-6 py-4 text-gray-300">{email.sender}</td>
                <td className="px-6 py-4 text-gray-500 hidden lg:table-cell">{email.recipient}</td>
                <td className="px-6 py-4 text-gray-400 max-w-[180px] truncate">{email.subject}</td>
                <td className={cn("px-6 py-4 font-bold", getRiskColor(email.riskScore))}>
                  {email.riskScore}
                </td>
                <td className="px-6 py-4">
                  <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border capitalize", statusStyles[email.status])}>
                    {email.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{email.receivedAt}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
