"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Search, RefreshCw, ShieldCheck, ShieldAlert, AlertTriangle, ChevronRight, Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getEmailQueue, fetchLiveGmailMessages, EmailItem, EmailListResponse } from "@/lib/api";
import { useLiveRefresh } from "@/lib/useLiveRefresh";
import { cn } from "@/lib/utils";

type EmailRow = {
  id: string;
  sender: string;
  address: string;
  subject: string;
  date: string;
  time: string;
  score: number;
  level: "CRITICAL" | "HIGH" | "SAFE";
  status: string;
};

function toRow(item: EmailItem): EmailRow {
  const hasAngle = item.sender.includes("<");
  const received = new Date(item.received_at || item.created_at);
  return {
    id: item.id,
    sender: hasAngle ? item.sender.split("<")[0].trim().replace(/^"|"$/g, "") : item.sender,
    address: hasAngle ? item.sender.split("<")[1].replace(">", "") : item.sender,
    subject: item.subject || "No Subject",
    date: received.toLocaleDateString([], { month: "short", day: "numeric" }),
    time: received.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    score: item.risk_score,
    level: item.risk_score > 80 ? "CRITICAL" : item.risk_score > 50 ? "HIGH" : "SAFE",
    status: item.status === "pending" ? "BLOCKED" : item.status.toUpperCase(),
  };
}

const filters = [
  { label: "All", value: undefined },
  { label: "Safe", value: "safe" },
  { label: "Quarantined", value: "quarantined" },
  { label: "Blocked", value: "blocked" },
] as const;

function scoreColor(score: number) {
  if (score > 80) return "var(--danger)";
  if (score > 50) return "var(--warning)";
  return "var(--success)";
}

export function EmailTable() {
  const router = useRouter();
  const [emailsState, setEmailsState] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const pageSize = 50;

  const showPage = useCallback((data: EmailListResponse) => {
    setTotal(data.total || 0);
    setEmailsState(data.items.map(toRow));
  }, []);

  useEffect(() => {
    async function loadEmails() {
      setLoading(true);
      try {
        let data = await getEmailQueue(page, pageSize, status);
        if (data.items.length === 0 && page === 1 && !status) {
          data = await fetchLiveGmailMessages("inbox", pageSize);
        }
        showPage(data);
      } catch (err) {
        console.error("Failed to fetch emails", err);
        setEmailsState([]); // Fallback to empty on error
      } finally {
        setLoading(false);
      }
    }
    loadEmails();
  }, [page, status, showPage]);

  // Mail the server scanned since the page loaded. Quiet: no spinner, and no
  // live mailbox fetch — the server already fetches on arrival.
  const refreshQuietly = useCallback(() => {
    getEmailQueue(page, pageSize, status)
      .then(showPage)
      .catch((err) => console.error("Failed to refresh emails", err));
  }, [page, status, showPage]);
  useLiveRefresh(refreshQuietly);

  // Search narrows the page already loaded; the API has no text search.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return emailsState;
    return emailsState.filter((e) =>
      [e.sender, e.address, e.subject].some((f) => f.toLowerCase().includes(q))
    );
  }, [emailsState, query]);

  return (
    <GlassCard className="relative z-10 flex w-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-secondary/60 p-1">
          {filters.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
                status === f.value
                  ? "bg-card text-accent shadow-[var(--glow-1)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by sender or subject"
              className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-72"
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                await fetchLiveGmailMessages("inbox", pageSize);
                showPage(await getEmailQueue(page, pageSize, status));
              } catch (err) {
                console.error("Failed to sync emails", err);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="btn-primary h-10 px-4 text-[13px] disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {loading ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-border bg-secondary/60 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Sender</th>
              <th className="px-5 py-3 font-medium">Subject</th>
              <th className="px-5 py-3 font-medium">Received</th>
              <th className="px-5 py-3 font-medium">Risk</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="w-10 px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && emailsState.length === 0 &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-5 py-4">
                    <div className="h-6 animate-pulse rounded bg-secondary" />
                  </td>
                </tr>
              ))}
            {visible.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <Inbox className="mx-auto h-8 w-8 text-accent" />
                  <p className="mt-3 text-muted-foreground">
                    {query ? "No emails on this page match that filter." : "No emails found in the database."}
                  </p>
                </td>
              </tr>
            )}
            {visible.map((email) => {
              const color = scoreColor(email.score);
              return (
                <tr
                  key={email.id}
                  onClick={() => router.push(`/emails/${email.id}`)}
                  className="group cursor-pointer transition-colors hover:bg-accent-subtle"
                >
                  <td className="max-w-[220px] px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary font-mono text-[11px] font-bold uppercase text-accent">
                        {email.sender.charAt(0) || "?"}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{email.sender}</div>
                        <div className="truncate font-mono text-[11px] text-muted-foreground">{email.address}</div>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[340px] truncate px-5 py-3.5 text-foreground/90">{email.subject}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[12px] text-muted-foreground">
                    {email.date} · {email.time}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(100, email.score)}%`, background: color }}
                        />
                      </div>
                      <span className="w-7 font-mono text-[12px] font-semibold" style={{ color }}>
                        {Math.round(email.score)}
                      </span>
                      <Badge
                        variant={email.level === "SAFE" ? "safe" : "blocked"}
                        className="hidden xl:inline-flex"
                      >
                        {email.level}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {email.status === "SAFE" ? (
                        <ShieldCheck className="h-4 w-4 text-[var(--success)]" />
                      ) : email.status === "QUARANTINED" ? (
                        <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-[var(--danger)]" />
                      )}
                      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                        {email.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-5 py-4 font-mono text-[11.5px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          {emailsState.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
          <span className="text-foreground">{total}</span> emails
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="rounded-lg border border-border px-3 py-1.5 transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="px-2 text-foreground">{page}</span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * pageSize >= total || loading}
            className="rounded-lg border border-border px-3 py-1.5 transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
