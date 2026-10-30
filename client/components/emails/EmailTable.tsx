"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Search, RefreshCw, ShieldCheck, ShieldAlert, AlertTriangle, ChevronRight, Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getEmailQueue,
  getLiveEmails,
  fetchLiveGmailMessages,
  EmailItem,
  EmailListResponse,
  LiveEmailItem,
  LiveEmailListResponse,
} from "@/lib/api";
import { useLiveRefresh } from "@/lib/useLiveRefresh";
import { cn } from "@/lib/utils";

type EmailRow = {
  key: string;
  // Null for mail the gateway never scanned: there is no verdict to open.
  id: string | null;
  sender: string;
  address: string;
  subject: string;
  date: string;
  time: string;
  score: number | null;
  level: "CRITICAL" | "HIGH" | "SAFE";
  status: string;
};

function toRow(item: EmailItem | LiveEmailItem): EmailRow {
  const hasAngle = item.sender.includes("<");
  const received = new Date(item.received_at || ("created_at" in item ? item.created_at : Date.now()));
  const score = item.risk_score;
  return {
    key: item.gmail_message_id || item.id || "",
    id: item.id,
    sender: hasAngle ? item.sender.split("<")[0].trim().replace(/^"|"$/g, "") : item.sender,
    address: hasAngle ? item.sender.split("<")[1].replace(">", "") : item.sender,
    subject: item.subject || "No Subject",
    date: received.toLocaleDateString([], { month: "short", day: "numeric" }),
    time: received.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    score,
    level: score == null ? "SAFE" : score > 80 ? "CRITICAL" : score > 50 ? "HIGH" : "SAFE",
    status:
      item.status == null
        ? "NOT SCANNED"
        : item.status === "pending"
          ? "BLOCKED"
          : item.status.toUpperCase(),
  };
}

const filters = [
  { label: "All", value: undefined },
  { label: "Safe", value: "safe" },
  { label: "Quarantined", value: "quarantined" },
  { label: "Blocked", value: "blocked" },
] as const;

function scoreColor(score: number | null) {
  if (score == null) return "var(--muted-foreground)";
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
  const [search, setSearch] = useState("");
  // "All" reads the mailbox live from Gmail, which pages by token rather than
  // by number: pageTokens[i] opens page i + 1. The verdict filters read the
  // gateway's rows, which only it has. Without a Gmail mailbox, or when the
  // live read fails, "All" falls back to those rows too.
  const [pageTokens, setPageTokens] = useState<(string | undefined)[]>([undefined]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [liveFailed, setLiveFailed] = useState(false);
  const live = !status && !liveFailed;
  const pageSize = 50;

  const showPage = useCallback((data: EmailListResponse) => {
    setTotal(data.total || 0);
    setNextToken(null);
    setEmailsState(data.items.map(toRow));
  }, []);

  const showLivePage = useCallback((data: LiveEmailListResponse) => {
    setTotal(data.total_estimate || 0);
    setNextToken(data.next_page_token);
    setEmailsState(data.items.map(toRow));
  }, []);

  // Gmail search covers the whole mailbox, so it waits for typing to pause
  // instead of firing a live read per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
      setPageTokens([undefined]);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    if (live) {
      try {
        showLivePage(await getLiveEmails(pageTokens[page - 1], pageSize, search));
        return;
      } catch (err) {
        console.error("Live mailbox read failed; showing scanned mail instead", err);
        setLiveFailed(true);
      }
    }
    showPage(await getEmailQueue(page, pageSize, status));
  }, [live, page, pageTokens, search, status, showPage, showLivePage]);

  useEffect(() => {
    async function loadEmails() {
      setLoading(true);
      try {
        await load();
      } catch (err) {
        console.error("Failed to fetch emails", err);
        setEmailsState([]); // Fallback to empty on error
      } finally {
        setLoading(false);
      }
    }
    loadEmails();
  }, [load]);

  // New mail and new verdicts since the page loaded. Quiet: no spinner.
  const refreshQuietly = useCallback(() => {
    load().catch((err) => console.error("Failed to refresh emails", err));
  }, [load]);
  useLiveRefresh(refreshQuietly);

  // Live search already ran in Gmail; the scanned rows have no text search,
  // so there it narrows the page already loaded.
  const visible = useMemo(() => {
    const q = search.toLowerCase();
    if (live || !q) return emailsState;
    return emailsState.filter((e) =>
      [e.sender, e.address, e.subject].some((f) => f.toLowerCase().includes(q))
    );
  }, [emailsState, search, live]);

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
                setPageTokens([undefined]);
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
              placeholder={live ? "Search your mailbox" : "Filter by sender or subject"}
              className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-72"
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                await fetchLiveGmailMessages("inbox", pageSize);
                await load();
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
                    {search
                      ? live
                        ? "No mail in your mailbox matches that search."
                        : "No emails on this page match that filter."
                      : live
                        ? "Your mailbox has no received mail."
                        : "No emails found in the database."}
                  </p>
                </td>
              </tr>
            )}
            {visible.map((email) => {
              const color = scoreColor(email.score);
              return (
                <tr
                  key={email.key}
                  onClick={email.id ? () => router.push(`/emails/${email.id}`) : undefined}
                  title={email.id ? undefined : "Not scanned by the gateway yet"}
                  className={cn(
                    "group transition-colors",
                    email.id ? "cursor-pointer hover:bg-accent-subtle" : "opacity-75"
                  )}
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
                          style={{ width: `${Math.min(100, email.score ?? 0)}%`, background: color }}
                        />
                      </div>
                      <span className="w-7 font-mono text-[12px] font-semibold" style={{ color }}>
                        {email.score == null ? "—" : Math.round(email.score)}
                      </span>
                      {email.score != null && (
                        <Badge
                          variant={email.level === "SAFE" ? "safe" : "blocked"}
                          className="hidden xl:inline-flex"
                        >
                          {email.level}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {email.status === "NOT SCANNED" ? (
                        <Inbox className="h-4 w-4 text-muted-foreground" />
                      ) : email.status === "SAFE" ? (
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
                    {email.id && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-5 py-4 font-mono text-[11.5px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          {emailsState.length === 0 ? 0 : (page - 1) * pageSize + 1}–
          {live ? (page - 1) * pageSize + emailsState.length : Math.min(page * pageSize, total)} of{" "}
          <span className="text-foreground">{live && nextToken ? `about ${total}` : total}</span> emails
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
            onClick={() => {
              if (live && nextToken) {
                setPageTokens((tokens) => [...tokens.slice(0, page), nextToken]);
              }
              setPage((p) => p + 1);
            }}
            disabled={(live ? !nextToken : page * pageSize >= total) || loading}
            className="rounded-lg border border-border px-3 py-1.5 transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
