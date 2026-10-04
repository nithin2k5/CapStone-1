"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  AlertTriangle,
  Mail,
  Activity,
  BarChart3,
  ArrowUpRight,
  XSquare,
} from "lucide-react";
import SectionHeading from "./SectionHeading";

const vectors = [
  { source: "Concealed instructions", percent: 45, tone: "danger" },
  { source: "Spoofed domains", percent: 30, tone: "warning" },
  { source: "Malicious URLs", percent: 15, tone: "accent-2" },
  { source: "Dangerous attachments", percent: 10, tone: "accent-2" },
] as const;

const activity = [
  42, 38, 55, 48, 62, 71, 65, 58, 82, 91, 88, 76, 69, 74, 85, 92, 98, 87, 79,
  83, 95, 88, 76, 69,
];

const intercepted = [
  {
    time: "10:42",
    sender: "admin@paypaI.com",
    subject: "Account suspended",
    finding: "Homograph domain",
    score: 91,
  },
  {
    time: "10:38",
    sender: "hr@company-portal.net",
    subject: "Q3 bonus document",
    finding: "Macro document",
    score: 84,
  },
  {
    time: "10:15",
    sender: "support@microsoft-update.com",
    subject: "Action required",
    finding: "DKIM failure",
    score: 78,
  },
  {
    time: "09:55",
    sender: "billing@invoice-cdn.co",
    subject: "Invoice #9921",
    finding: "Hidden instructions",
    score: 88,
  },
];

const toneVar = {
  danger: "var(--danger)",
  warning: "var(--warning)",
  "accent-2": "var(--accent-2)",
} as const;

export default function DashboardPreview() {
  return (
    <section id="dashboard" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Console"
            align="left"
            title={
              <>
                Analyst <span className="text-gradient">console</span>
              </>
            }
            description="Every verdict arrives with the findings that produced it — which channel concealed what, which pattern matched, which combination compounded."
          />
          <Link
            href="/dashboard"
            className="btn-secondary shrink-0 px-5 py-3 text-sm"
          >
            Open the console
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="panel-flush mt-14"
          style={{ boxShadow: "var(--glow-3), var(--glow-accent)" }}
        >
          {/* Chrome */}
          <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-accent" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
                live threat feed
              </span>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              last 24h
            </span>
          </div>

          <div
            className="grid gap-px lg:grid-cols-3"
            style={{ background: "var(--border)" }}
          >
            {/* Risk dial */}
            <div className="bg-card p-6">
              <h3 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                mailbox risk
              </h3>

              <div className="mt-7 flex items-center justify-center">
                <div className="relative flex h-40 w-40 items-center justify-center">
                  <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      strokeWidth="7"
                      stroke="var(--border)"
                    />
                    <motion.circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      strokeWidth="7"
                      strokeLinecap="round"
                      stroke="var(--danger)"
                      strokeDasharray="351"
                      initial={{ strokeDashoffset: 351 }}
                      whileInView={{ strokeDashoffset: 351 - 351 * 0.78 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.3, ease: "easeOut" }}
                      style={{ filter: "drop-shadow(0 0 6px var(--danger))" }}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <div className="display text-[2.6rem] text-foreground">78</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      of 100
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="mt-6 rounded-xl border px-4 py-2.5 text-center"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--danger) 35%, var(--border))",
                  background: "color-mix(in srgb, var(--danger) 8%, transparent)",
                }}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--danger)]">
                  above quarantine threshold
                </span>
              </div>
            </div>

            {/* Vectors */}
            <div className="bg-card p-6">
              <h3 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" />
                why mail was flagged
              </h3>

              <div className="mt-7 space-y-5">
                {vectors.map((item, i) => (
                  <div key={item.source}>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <span className="text-[13px] text-foreground">
                        {item.source}
                      </span>
                      <span
                        className="font-mono text-[12px] font-medium"
                        style={{ color: toneVar[item.tone] }}
                      >
                        {item.percent}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: toneVar[item.tone],
                          boxShadow: `0 0 10px ${toneVar[item.tone]}`,
                        }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${item.percent}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Volume */}
            <div className="bg-card p-6">
              <h3 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5" />
                flagged volume
              </h3>

              <div className="mt-7 flex h-40 items-end gap-[3px]">
                {activity.map((height, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      background:
                        height > 85 ? "var(--danger)" : "var(--border-strong)",
                      boxShadow:
                        height > 85 ? "0 0 8px var(--danger)" : undefined,
                    }}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${height}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.018 }}
                  />
                ))}
              </div>

              <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <span>00:00</span>
                <span>23:00</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="border-t border-border bg-card">
            <h3 className="flex items-center gap-2 px-6 pt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              intercepted payloads
            </h3>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead>
                  <tr className="border-y border-border bg-secondary/60 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Time</th>
                    <th className="px-6 py-3 font-medium">Sender</th>
                    <th className="px-6 py-3 font-medium">Subject</th>
                    <th className="px-6 py-3 font-medium">Primary finding</th>
                    <th className="px-6 py-3 font-medium">Risk</th>
                    <th className="px-6 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {intercepted.map((row, i) => (
                    <motion.tr
                      key={row.sender}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.08 }}
                      className="border-b border-border transition-colors last:border-0 hover:bg-secondary/50"
                    >
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-[12px] text-muted-foreground">
                        {row.time}
                      </td>
                      <td className="px-6 py-4 font-mono text-[12px] font-medium text-[var(--danger)]">
                        {row.sender}
                      </td>
                      <td className="max-w-[180px] truncate px-6 py-4 text-[13px] text-foreground">
                        {row.subject}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-[var(--warning)]">
                          <AlertTriangle className="h-3 w-3" />
                          {row.finding}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="pill"
                          style={{
                            borderColor:
                              "color-mix(in srgb, var(--danger) 35%, var(--border))",
                            background:
                              "color-mix(in srgb, var(--danger) 12%, transparent)",
                            color: "var(--danger)",
                          }}
                        >
                          {row.score}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                          <XSquare className="h-3 w-3" />
                          blocked
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          sample data · shown for illustration
        </p>
      </div>
    </section>
  );
}
