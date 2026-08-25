"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Search, Filter, ShieldCheck, ShieldAlert, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getEmailQueue, fetchLiveGmailMessages, EmailItem } from "@/lib/api";

// Mock data removed in favor of dynamic backend fetching

export function EmailTable() {
  const [emailsState, setEmailsState] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    async function loadEmails() {
      setLoading(true);
      try {
        let data = await getEmailQueue(page, pageSize);
        if (data.items.length === 0 && page === 1) {
          data = await fetchLiveGmailMessages("inbox", pageSize);
        }
        
        setTotal(data.total || 0);

        if (data.items.length > 0) {
          const formatted = data.items.map((item: EmailItem) => {
            const senderName = item.sender.includes("<") ? item.sender.split("<")[0].trim() : item.sender;
            return {
              id: item.id,
              sender: senderName,
              subject: item.subject || "No Subject",
              time: new Date(item.received_at || item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              level: item.risk_score > 80 ? "CRITICAL" : item.risk_score > 50 ? "HIGH" : "SAFE",
              status: item.status === "pending" ? "BLOCKED" : item.status.toUpperCase(),
              analysis: item.risk_score > 80 ? "Malicious attachment/link" : "Passed all checks"
            };
          });
          setEmailsState(formatted);
        } else {
          setEmailsState([]);
        }
      } catch (err) {
        console.error("Failed to fetch emails", err);
        setEmailsState([]); // Fallback to empty on error
      } finally {
        setLoading(false);
      }
    }
    loadEmails();
  }, [page]);

  return (
    <GlassCard className="flex flex-col relative z-10 w-full">
      <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-heading font-bold text-white tracking-wide">Email Traffic</h3>
          <p className="text-xs text-gray-500 mt-1">All scanned inbound emails.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search emails..." 
              className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 text-white w-64"
            />
          </div>
          <button 
            onClick={async () => {
              setLoading(true);
              try {
                await fetchLiveGmailMessages("inbox", pageSize);
                const data = await getEmailQueue(page, pageSize);
                
                setTotal(data.total || 0);
                if (data.items.length > 0) {
                  const formatted = data.items.map((item: EmailItem) => {
                    const senderName = item.sender.includes("<") ? item.sender.split("<")[0].trim() : item.sender;
                    return {
                      id: item.id,
                      sender: senderName,
                      subject: item.subject || "No Subject",
                      time: new Date(item.received_at || item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      level: item.risk_score > 80 ? "CRITICAL" : item.risk_score > 50 ? "HIGH" : "SAFE",
                      status: item.status === "pending" ? "BLOCKED" : item.status.toUpperCase(),
                      analysis: item.risk_score > 80 ? "Malicious attachment/link" : "Passed all checks"
                    };
                  });
                  setEmailsState(formatted);
                } else {
                  setEmailsState([]);
                }
              } catch (err) {
                console.error("Failed to sync emails", err);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-xl flex items-center gap-2 text-sm text-indigo-300 transition-colors disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {loading ? "Syncing..." : "Sync Now"}
          </button>
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center gap-2 text-sm text-gray-300 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-gray-500 uppercase bg-black/20 border-b border-white/5">
            <tr>
              <th className="px-6 py-4 font-medium tracking-wider">Sender</th>
              <th className="px-6 py-4 font-medium tracking-wider w-1/3">Subject</th>
              <th className="px-6 py-4 font-medium tracking-wider">Received</th>
              <th className="px-6 py-4 font-medium tracking-wider">Threat Level</th>
              <th className="px-6 py-4 font-medium tracking-wider">Status</th>
              <th className="px-6 py-4 font-medium tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {emailsState.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No emails found in the database.
                </td>
              </tr>
            )}
            {emailsState.map((email) => (
              <tr key={email.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                <td className="px-6 py-4">
                  <div className="font-medium text-white">{email.sender}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-300 truncate max-w-xs md:max-w-md">{email.subject}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{email.analysis}</div>
                </td>
                <td className="px-6 py-4 text-gray-500 text-xs">
                  {email.time}
                </td>
                <td className="px-6 py-4">
                  <Badge 
                    variant={
                      email.level === "SAFE" ? "safe" :
                      email.level === "CRITICAL" ? "blocked" :
                      email.level === "HIGH" ? "blocked" : "suspicious"
                    }
                  >
                    {email.level}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {email.status === "DELIVERED" ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    ) : email.status === "QUARANTINED" ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-xs font-semibold tracking-wider text-gray-400">
                      {email.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link 
                    href={`/emails/${email.id}`}
                    className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium rounded-lg text-white bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 transition-all shadow-[0_0_10px_rgba(99,102,241,0.1)] hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                  >
                    Analysis
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
        <div>
          Showing {emailsState.length === 0 ? 0 : (page - 1) * pageSize + 1}-
          {Math.min(page * pageSize, total)} of {total} emails
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-50 transition-colors"
          >
            Previous
          </button>
          <button 
            onClick={() => setPage(p => p + 1)}
            disabled={page * pageSize >= total || loading}
            className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-50 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
