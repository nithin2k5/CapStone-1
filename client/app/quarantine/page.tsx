"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Search, Lock, RefreshCw, ArrowUpRight, Clock } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { getEmailQueue, rescanEmail, EmailItem } from "@/lib/api";
import { useLiveRefresh } from "@/lib/useLiveRefresh";
import { cn } from "@/lib/utils";

type Level = "CRITICAL" | "HIGH" | "MEDIUM";

/** A quarantined message as this vault shows it, not as the API returns it. */
type QuarantineRow = {
  id: string;
  sender: string;
  address: string;
  subject: string;
  when: string;
  score: number;
  level: Level;
};

const levelColor: Record<Level, string> = {
  CRITICAL: "var(--danger)",
  HIGH: "color-mix(in srgb, var(--danger) 65%, var(--warning))",
  MEDIUM: "var(--warning)",
};

function toRow(item: EmailItem): QuarantineRow {
  const hasAngle = item.sender.includes("<");
  return {
    id: item.id,
    sender: hasAngle ? item.sender.split("<")[0].trim().replace(/^"|"$/g, "") : item.sender,
    address: hasAngle ? item.sender.split("<")[1].replace(">", "") : item.sender,
    subject: item.subject || "No Subject",
    when: new Date(item.received_at || item.created_at).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    score: item.risk_score,
    level: item.risk_score > 80 ? "CRITICAL" : item.risk_score > 50 ? "HIGH" : "MEDIUM",
  };
}

export default function QuarantinePage() {
  const [emails, setEmails] = useState<QuarantineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<Level | "ALL">("ALL");
  const [rescanning, setRescanning] = useState<string | null>(null);

  const loadQuarantine = useCallback(async () => {
    try {
      const data = await getEmailQueue(1, 50, "quarantined");
      setEmails(data.items.map(toRow));
    } catch (err) {
      console.error("Failed to load quarantine queue", err);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useLiveRefresh(loadQuarantine, { immediate: true });

  const counts = useMemo(
    () => ({
      ALL: emails.length,
      CRITICAL: emails.filter((e) => e.level === "CRITICAL").length,
      HIGH: emails.filter((e) => e.level === "HIGH").length,
      MEDIUM: emails.filter((e) => e.level === "MEDIUM").length,
    }),
    [emails]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return emails.filter(
      (e) =>
        (level === "ALL" || e.level === level) &&
        (!q || [e.sender, e.address, e.subject].some((f) => f.toLowerCase().includes(q)))
    );
  }, [emails, query, level]);

  const handleRescan = async (id: string) => {
    setRescanning(id);
    try {
      await rescanEmail(id);
      await loadQuarantine();
    } catch (err) {
      console.error("Re-scan failed", err);
    } finally {
      setRescanning(null);
    }
  };

  const tiles: { key: Level | "ALL"; label: string; color: string }[] = [
    { key: "ALL", label: "Held", color: "var(--accent)" },
    { key: "CRITICAL", label: "Critical", color: levelColor.CRITICAL },
    { key: "HIGH", label: "High", color: levelColor.HIGH },
    { key: "MEDIUM", label: "Medium", color: levelColor.MEDIUM },
  ];

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="eyebrow">
            <span className="h-px w-6 bg-accent" />
            containment
          </span>
          <h2 className="display mt-3 flex items-center gap-3 text-[1.7rem] text-foreground">
            Quarantine vault
          </h2>
          <p className="mt-1.5 max-w-2xl text-[14px] text-muted-foreground">
            Mail scoring above the quarantine threshold is held here for review.
            Re-scan a message after tuning sensitivity, or inspect its evidence.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by sender or subject"
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20 md:w-72"
          />
        </div>
      </div>

      {/* Level tiles double as the filter */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setLevel(t.key)}
            className={cn(
              "panel group relative overflow-hidden p-4 text-left transition-all",
              level === t.key ? "ring-2 ring-accent/50" : "hover:border-border-strong"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                {t.label}
              </span>
              <span className="h-2 w-2 rounded-full" style={{ background: t.color, boxShadow: `0 0 8px ${t.color}` }} />
            </div>
            <div className="display mt-2 text-[1.9rem] leading-none" style={{ color: t.key === "ALL" ? "var(--foreground)" : t.color }}>
              {loading ? "—" : counts[t.key]}
            </div>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-border bg-card/60" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Lock}
          title={emails.length === 0 ? "The vault is empty" : "Nothing matches"}
          description={
            emails.length === 0
              ? "No mail is currently held. Messages above the quarantine threshold will appear here."
              : "No held message matches this filter."
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((email, i) => {
            const color = levelColor[email.level];
            return (
              <motion.div
                key={email.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.04 }}
              >
                <GlassCard hover className="flex h-full flex-col overflow-hidden">
                  {/* Hazard stripe in the threat colour */}
                  <div
                    className="h-1 w-full"
                    style={{
                      background: `repeating-linear-gradient(135deg, ${color} 0 10px, transparent 10px 20px)`,
                      opacity: 0.7,
                    }}
                  />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <Badge variant={email.level === "MEDIUM" ? "suspicious" : "blocked"}>
                        {email.level}
                      </Badge>
                      <div className="text-right">
                        <div className="display text-[1.6rem] leading-none" style={{ color }}>
                          {Math.round(email.score)}
                        </div>
                        <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
                          risk
                        </div>
                      </div>
                    </div>

                    <h3 className="mt-3 line-clamp-2 text-[14.5px] font-semibold leading-snug text-foreground">
                      {email.subject}
                    </h3>
                    <div className="mt-1.5 truncate font-mono text-[11.5px] text-muted-foreground">
                      {email.sender !== email.address ? `${email.sender} · ` : ""}
                      {email.address}
                    </div>

                    <div className="mt-4 h-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, email.score)}%`, background: color }} />
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-2 pt-5">
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {email.when}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRescan(email.id)}
                          disabled={rescanning === email.id}
                          title="Re-scan"
                          className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
                        >
                          <RefreshCw className={cn("h-3.5 w-3.5", rescanning === email.id && "animate-spin")} />
                        </button>
                        <Link
                          href={`/emails/${email.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-accent/30 bg-accent-subtle px-3 py-1.5 text-[12px] font-medium text-accent transition-colors hover:bg-accent/20"
                        >
                          Inspect <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
