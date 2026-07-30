"use client";

import { motion } from "framer-motion";
import { emailQueue } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const statusStyles = {
  scanning: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  clean: "bg-green-500/10 text-green-400 border-green-500/20",
  blocked: "bg-red-500/10 text-red-400 border-red-500/20",
  queued: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

function getRiskColor(score: number) {
  if (score >= 80) return "text-red-400";
  if (score >= 50) return "text-orange-400";
  if (score >= 25) return "text-yellow-400";
  return "text-green-400";
}

export default function EmailQueueTable() {
  return (
    <div className="glass-card rounded-2xl border border-white/[0.05] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.05]">
        <h3 className="font-medium text-white">Email Processing Queue</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-white/[0.05]">
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
                className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-6 py-4 font-mono text-gray-500 text-xs">{email.id}</td>
                <td className="px-6 py-4 text-white">{email.sender}</td>
                <td className="px-6 py-4 text-gray-400 hidden lg:table-cell">{email.recipient}</td>
                <td className="px-6 py-4 text-gray-300 max-w-[180px] truncate">{email.subject}</td>
                <td className={cn("px-6 py-4 font-bold", getRiskColor(email.riskScore))}>
                  {email.riskScore}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
                      statusStyles[email.status]
                    )}
                  >
                    {email.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{email.receivedAt}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
