"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Search, Filter, ShieldAlert, CheckCircle2, ShieldX, Box } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

import { useEffect } from "react";
import { getEmailQueue, EmailItem } from "@/lib/api";

/** A quarantined message as this table shows it, not as the API returns it. */
type QuarantineRow = {
  id: string;
  sender: string;
  subject: string;
  time: string;
  level: "CRITICAL" | "HIGH" | "MEDIUM";
  reason: string;
};

export default function QuarantinePage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [emails, setEmails] = useState<QuarantineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadQuarantine() {
      try {
        const data = await getEmailQueue(1, 50, "quarantined");
        if (data.items.length > 0) {
          const formatted: QuarantineRow[] = data.items.map((item: EmailItem) => ({
            id: item.id,
            sender: item.sender.includes("<") ? item.sender.split("<")[0].trim() : item.sender,
            subject: item.subject || "No Subject",
            time: new Date(item.received_at || item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            level: item.risk_score > 80 ? "CRITICAL" : item.risk_score > 50 ? "HIGH" : "MEDIUM",
            reason: item.risk_score > 80 ? "Malicious payload detected" : "Suspicious sender/content"
          }));
          setEmails(formatted);
        } else {
          setEmails([]);
        }
      } catch (err) {
        console.error("Failed to load quarantine queue", err);
        setEmails([]);
      } finally {
        setLoading(false);
      }
    }
    loadQuarantine();
  }, []);

  const toggleSelect = (id: string) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selected.length === emails.length) {
      setSelected([]);
    } else {
      setSelected(emails.map(e => e.id));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2 flex items-center gap-2">
            <Box className="w-6 h-6 text-indigo-400" />
            Quarantine Vault
          </h1>
          <p className="text-sm text-muted-foreground">Manage suspended emails awaiting manual review.</p>
        </div>
      </div>

      <GlassCard className="flex flex-col relative z-10 w-full">
        <div className="p-4 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/[0.01]">
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search quarantine..." 
                className="pl-9 pr-4 py-2 bg-foreground/5 border border-border rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 text-foreground w-full lg:w-64"
              />
            </div>
            <button className="px-4 py-2 bg-foreground/5 hover:bg-foreground/10 border border-border rounded-xl flex items-center gap-2 text-sm text-gray-300 transition-colors">
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
            <thead className="text-xs text-muted-foreground uppercase bg-black/20 border-b border-border">
              <tr>
                <th className="px-6 py-4 w-12">
                  <input 
                    type="checkbox" 
                    className="rounded border-border bg-black/50 checked:bg-indigo-500 focus:ring-indigo-500/50"
                    checked={selected.length === emails.length && emails.length > 0}
                    onChange={selectAll}
                  />
                </th>
                <th className="px-6 py-4 font-medium tracking-wider">Sender</th>
                <th className="px-6 py-4 font-medium tracking-wider">Subject & Reason</th>
                <th className="px-6 py-4 font-medium tracking-wider">Quarantined</th>
                <th className="px-6 py-4 font-medium tracking-wider">Threat Level</th>
                <th className="px-6 py-4 font-medium tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {emails.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No emails in quarantine.
                  </td>
                </tr>
              )}
              {emails.map((email, i) => (
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
                      className="rounded border-border bg-black/50 checked:bg-indigo-500 focus:ring-indigo-500/50"
                      checked={selected.includes(email.id)}
                      onChange={() => toggleSelect(email.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{email.sender}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-300 font-medium truncate max-w-xs md:max-w-md">{email.subject}</div>
                    <div className="text-xs text-red-400 mt-1 flex items-center gap-1.5">
                      <ShieldAlert className="w-3 h-3" />
                      {email.reason}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
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
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/emails/${email.id}`}
                      className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium rounded-lg text-foreground bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 transition-all shadow-[0_0_10px_rgba(99,102,241,0.1)] hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] opacity-0 group-hover:opacity-100"
                    >
                      Analysis
                    </Link>
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
