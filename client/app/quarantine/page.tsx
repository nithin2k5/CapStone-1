"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Search, Filter, ShieldAlert, CheckCircle2, ShieldX, Box } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const quarantinedEmails = [
  { id: "q1", sender: "hr@acme-corp.net", subject: "Updated 2026 Salary Packages", time: "09:45 AM", level: "CRITICAL", reason: "Malicious macro attachment" },
  { id: "q2", sender: "admin@it-support-desk.com", subject: "Password expiry notice", time: "Yesterday", level: "MEDIUM", reason: "Spoofed Sender Domain" },
  { id: "q3", sender: "invoice@billing-department-update.com", subject: "Invoice #99281", time: "Yesterday", level: "HIGH", reason: "Suspicious PDF payload" },
];

export default function QuarantinePage() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selected.length === quarantinedEmails.length) {
      setSelected([]);
    } else {
      setSelected(quarantinedEmails.map(e => e.id));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white mb-2 flex items-center gap-2">
            <Box className="w-6 h-6 text-indigo-400" />
            Quarantine Vault
          </h1>
          <p className="text-sm text-gray-400">Manage suspended emails awaiting manual review.</p>
        </div>
      </div>

      <GlassCard className="flex flex-col relative z-10 w-full">
        <div className="p-4 border-b border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/[0.01]">
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search quarantine..." 
                className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 text-white w-full lg:w-64"
              />
            </div>
            <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center gap-2 text-sm text-gray-300 transition-colors">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="secondary" 
              size="sm" 
              icon={CheckCircle2} 
              disabled={selected.length === 0}
            >
              Release Selected
            </Button>
            <Button 
              variant="danger" 
              size="sm" 
              icon={ShieldX} 
              disabled={selected.length === 0}
            >
              Delete Permanently
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-gray-500 uppercase bg-black/20 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 w-12">
                  <input 
                    type="checkbox" 
                    className="rounded border-white/20 bg-black/50 checked:bg-indigo-500 focus:ring-indigo-500/50"
                    checked={selected.length === quarantinedEmails.length && quarantinedEmails.length > 0}
                    onChange={selectAll}
                  />
                </th>
                <th className="px-6 py-4 font-medium tracking-wider">Sender</th>
                <th className="px-6 py-4 font-medium tracking-wider">Subject & Reason</th>
                <th className="px-6 py-4 font-medium tracking-wider">Quarantined</th>
                <th className="px-6 py-4 font-medium tracking-wider">Threat Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {quarantinedEmails.map((email, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={email.id} 
                  className="hover:bg-white/[0.03] transition-colors group"
                >
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-white/20 bg-black/50 checked:bg-indigo-500 focus:ring-indigo-500/50"
                      checked={selected.includes(email.id)}
                      onChange={() => toggleSelect(email.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{email.sender}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-300 font-medium truncate max-w-xs md:max-w-md">{email.subject}</div>
                    <div className="text-xs text-red-400 mt-1 flex items-center gap-1.5">
                      <ShieldAlert className="w-3 h-3" />
                      {email.reason}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {email.time}
                  </td>
                  <td className="px-6 py-4">
                    <Badge 
                      variant={
                        email.level === "CRITICAL" ? "blocked" :
                        email.level === "HIGH" ? "blocked" : "suspicious"
                      }
                    >
                      {email.level}
                    </Badge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
