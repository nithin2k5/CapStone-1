"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { MoreVertical, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getEmailQueue, fetchLiveGmailMessages, EmailItem } from "@/lib/api";

// Mock data removed in favor of dynamic backend fetching

export function RecentEmails() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEmails() {
      try {
        let data = await getEmailQueue(1, 5);
        if (data.items.length === 0) {
          data = await fetchLiveGmailMessages("inbox", 5);
        }
        if (data.items.length > 0) {
          const formatted = data.items.map((item: EmailItem) => {
            const senderName = item.sender.includes("<") ? item.sender.split("<")[0].trim() : item.sender;
            const senderEmail = item.sender.includes("<") ? item.sender.split("<")[1].replace(">", "") : item.sender;
            return {
              id: item.id,
              sender: senderName,
              email: senderEmail,
              subject: item.subject || "No Subject",
              time: new Date(item.received_at || item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              level: item.risk_score > 80 ? "CRITICAL" : item.risk_score > 50 ? "HIGH" : "SAFE",
              status: item.status === "pending" ? "BLOCKED" : item.status.toUpperCase()
            };
          });
          setEmails(formatted);
        } else {
          setEmails([]);
        }
      } catch (err) {
        console.error("Failed to fetch real emails", err);
        setEmails([]);
      } finally {
        setLoading(false);
      }
    }
    loadEmails();
  }, []);

  return (
    <GlassCard className="col-span-1 lg:col-span-3 flex flex-col relative z-10">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-base font-heading font-bold text-foreground tracking-wide">Recent Emails</h3>
          <p className="text-xs text-muted-foreground mt-1">Latest inbound traffic analyzed by the gateway.</p>
        </div>
        <Link href="/emails" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
          View All Traffic &rarr;
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-black/20 border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium tracking-wider">Sender</th>
              <th className="px-6 py-4 font-medium tracking-wider">Subject</th>
              <th className="px-6 py-4 font-medium tracking-wider">Received</th>
              <th className="px-6 py-4 font-medium tracking-wider">Threat Level</th>
              <th className="px-6 py-4 font-medium tracking-wider">Status</th>
              <th className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {emails.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                  No emails found.
                </td>
              </tr>
            )}
            {emails.map((email, i) => (
              <motion.tr 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={email.id} 
                className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-foreground">{email.sender}</div>
                  <div className="text-xs text-muted-foreground">{email.email}</div>
                </td>
                <td className="px-6 py-4 text-gray-300">
                  {email.subject}
                </td>
                <td className="px-6 py-4 text-muted-foreground text-xs">
                  {email.time}
                </td>
                <td className="px-6 py-4">
                  <Badge 
                    variant={
                      email.level === "SAFE" ? "safe" :
                      email.level === "CRITICAL" ? "blocked" :
                      "suspicious"
                    }
                  >
                    {email.level}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {email.status === "DELIVERED" ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-xs font-semibold tracking-wider text-muted-foreground">
                      {email.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/10 opacity-0 group-hover:opacity-100 transition-all">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
