"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getEmailQueue, fetchLiveGmailMessages, type EmailItem } from "@/lib/api";
import { cn } from "@/lib/utils";
import { RefreshCw, Mail, Loader2 } from "lucide-react";

const statusStyles: Record<string, string> = {
  pending: "bg-white/[0.06] text-muted-foreground border-white/[0.08]",
  scanned: "bg-white/[0.04] text-blue-400 border-white/[0.06]",
  safe: "bg-white/[0.04] text-emerald-400 border-white/[0.06]",
  quarantined: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  blocked: "bg-red-500/10 text-red-400 border-red-500/20",
};

function getRiskColor(score: number) {
  if (score >= 75) return "text-red-400 font-bold";
  if (score >= 40) return "text-amber-400 font-medium";
  if (score >= 10) return "text-blue-300";
  return "text-emerald-400";
}

export default function EmailQueueTable() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEmails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEmailQueue();
      setEmails(res.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load emails from database");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchGmails = async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetchLiveGmailMessages("inbox", 20);
      setEmails(res.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch live Gmails");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, []);

  return (
    <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-medium text-foreground">Email Processing Queue</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadEmails}
            disabled={loading}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg bg-white/[0.03] border border-white/[0.06]"
            title="Refresh Table"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={handleFetchGmails}
            disabled={fetching}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-foreground/10 text-foreground hover:bg-white/15 border border-border transition-all shadow-sm"
          >
            {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            Fetch Live Gmails
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-400 text-xs border-b border-red-500/20 text-center">
          {error}
        </div>
      )}

      {loading && emails.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          Loading emails from server...
        </div>
      ) : emails.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center text-muted-foreground px-4">
          <Mail className="w-10 h-10 mb-3 text-gray-600 stroke-[1.5]" />
          <p className="text-gray-300 font-medium mb-1">No emails in queue yet</p>
          <p className="text-xs max-w-sm mb-4">
            Click &quot;Fetch Live Gmails&quot; above to connect to your Gmail inbox and import messages for real-time security scanning.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-600 border-b border-white/[0.06]">
                <th className="px-6 py-3 font-medium">Message ID</th>
                <th className="px-6 py-3 font-medium">Sender</th>
                <th className="px-6 py-3 font-medium hidden lg:table-cell">Recipient</th>
                <th className="px-6 py-3 font-medium">Subject</th>
                <th className="px-6 py-3 font-medium">Risk Score</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Received At</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email, i) => (
                <motion.tr
                  key={email.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4 font-mono text-muted-foreground text-xs truncate max-w-[120px]">
                    {email.gmail_message_id}
                  </td>
                  <td className="px-6 py-4 text-gray-300 truncate max-w-[180px]">{email.sender}</td>
                  <td className="px-6 py-4 text-muted-foreground hidden lg:table-cell truncate max-w-[180px]">{email.recipient}</td>
                  <td className="px-6 py-4 text-muted-foreground max-w-[220px] truncate">{email.subject || "(No Subject)"}</td>
                  <td className={cn("px-6 py-4", getRiskColor(email.risk_score))}>
                    {email.risk_score.toFixed(0)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border capitalize", statusStyles[email.status] || statusStyles.pending)}>
                      {email.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-xs">
                    {email.received_at ? new Date(email.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(email.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
