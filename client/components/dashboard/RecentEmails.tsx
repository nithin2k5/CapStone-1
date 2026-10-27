"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { ArrowUpRight, ChevronRight, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { getEmailQueue, fetchLiveGmailMessages, EmailItem, EmailListResponse } from "@/lib/api";
import { useLiveRefresh } from "@/lib/useLiveRefresh";

type RecentRow = {
  id: string;
  sender: string;
  email: string;
  subject: string;
  time: string;
  level: "CRITICAL" | "HIGH" | "SAFE";
  status: string;
};

export function RecentEmails() {
  const [emails, setEmails] = useState<RecentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const show = useCallback((data: EmailListResponse) => {
        if (data.items.length > 0) {
          const formatted: RecentRow[] = data.items.map((item: EmailItem) => {
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
  }, []);

  useEffect(() => {
    async function loadEmails() {
      try {
        let data = await getEmailQueue(1, 5);
        if (data.items.length === 0) {
          data = await fetchLiveGmailMessages("inbox", 5);
        }
        show(data);
      } catch (err) {
        console.error("Failed to fetch real emails", err);
        setEmails([]);
      } finally {
        setLoading(false);
      }
    }
    loadEmails();
  }, [show]);

  const refreshQuietly = useCallback(() => {
    getEmailQueue(1, 5)
      .then(show)
      .catch((err) => console.error("Failed to refresh recent emails", err));
  }, [show]);
  useLiveRefresh(refreshQuietly);

  return (
    <GlassCard className="relative z-10 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <div>
          <h3 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
            recent emails
          </h3>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Latest inbound mail analysed by the gateway.
          </p>
        </div>
        <Link
          href="/emails"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-accent transition-colors hover:text-accent-hover"
        >
          All emails <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-secondary/60 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <tr>
              <th className="px-6 py-3 font-medium">Sender</th>
              <th className="px-6 py-3 font-medium">Subject</th>
              <th className="px-6 py-3 font-medium">Received</th>
              <th className="px-6 py-3 font-medium">Threat level</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="w-10 px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading &&
              [0, 1, 2].map((i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-6 py-4">
                    <div className="h-5 animate-pulse rounded bg-secondary" />
                  </td>
                </tr>
              ))}
            {emails.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                  No emails found.
                </td>
              </tr>
            )}
            {emails.map((email, i) => (
              <motion.tr
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                key={email.id}
                onClick={() => router.push(`/emails/${email.id}`)}
                className="group cursor-pointer transition-colors hover:bg-accent-subtle"
              >
                <td className="px-6 py-3.5">
                  <div className="font-medium text-foreground">{email.sender}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{email.email}</div>
                </td>
                <td className="max-w-[260px] truncate px-6 py-3.5 text-foreground/90">
                  {email.subject}
                </td>
                <td className="px-6 py-3.5 font-mono text-[12px] text-muted-foreground">
                  {email.time}
                </td>
                <td className="px-6 py-3.5">
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
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-2">
                    {email.status === "SAFE" ? (
                      <ShieldCheck className="h-4 w-4 text-[var(--success)]" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-[var(--danger)]" />
                    )}
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      {email.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-right">
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-accent group-hover:opacity-100" />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
