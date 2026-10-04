"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Mail, Activity, BarChart3 } from "lucide-react";
import SectionHeading from "./SectionHeading";

const vectors = [
  { source: "Concealed instructions", percent: 45 },
  { source: "Spoofed domains", percent: 30 },
  { source: "Malicious URLs", percent: 15 },
  { source: "Dangerous attachments", percent: 10 },
];

const activity = [
  42, 38, 55, 48, 62, 71, 65, 58, 82, 91, 88, 76, 69, 74, 85, 92, 98, 87, 79,
  83, 95, 88, 76, 69,
];

const intercepted = [
  {
    time: "10:42",
    sender: "admin@paypaI.com",
    subject: "Account suspended",
    type: "Homograph domain",
    score: 91,
  },
  {
    time: "10:38",
    sender: "hr@company-portal.net",
    subject: "Q3 bonus document",
    type: "Macro document",
    score: 84,
  },
  {
    time: "10:15",
    sender: "support@microsoft-update.com",
    subject: "Action required",
    type: "DKIM failure",
    score: 78,
  },
  {
    time: "09:55",
    sender: "billing@invoice-cdn.co",
    subject: "Invoice #9921",
    type: "Hidden instructions",
    score: 88,
  },
];

export default function DashboardPreview() {
  return (
    <section id="dashboard" className="py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Console"
          title="Every verdict, with the evidence behind it"
          description="Analysts see the per-layer scores, what each one found, and why the composition landed where it did."
          align="left"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45 }}
          className="glass mt-14 overflow-hidden shadow-[0_24px_60px_-30px_rgba(15,23,42,0.2)] dark:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.65)]"
        >
          {/* Window chrome */}
          <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="text-[13px] font-medium text-foreground">
                Threat overview
              </span>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              last 24 hours
            </span>
          </div>

          <div className="grid gap-px bg-border lg:grid-cols-3">
            {/* Risk gauge */}
            <div className="bg-card p-6">
              <h3 className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                Mailbox risk
              </h3>

              <div className="mt-6 flex items-center justify-center">
                <div className="relative flex h-36 w-36 items-center justify-center">
                  <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      strokeWidth="8"
                      stroke="var(--border)"
                    />
                    <motion.circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      strokeWidth="8"
                      strokeLinecap="round"
                      stroke="var(--danger)"
                      strokeDasharray="351"
                      initial={{ strokeDashoffset: 351 }}
                      whileInView={{ strokeDashoffset: 351 - 351 * 0.78 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.1, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <div className="font-mono text-3xl font-semibold tracking-tight text-foreground">
                      78
                    </div>
                    <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                      of 100
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-5 text-center text-[13px] font-medium text-[var(--danger)]">
                Elevated — review quarantine
              </p>
            </div>

            {/* Vectors */}
            <div className="bg-card p-6">
              <h3 className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" />
                Why mail was flagged
              </h3>

              <div className="mt-6 space-y-4">
                {vectors.map((item, i) => (
                  <div key={item.source}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="text-[13px] text-foreground">
                        {item.source}
                      </span>
                      <span className="font-mono text-[12px] text-muted-foreground">
                        {item.percent}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        className="h-full rounded-full bg-accent"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${item.percent}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.08 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div className="bg-card p-6">
              <h3 className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5" />
                Flagged volume
              </h3>

              <div className="mt-6 flex h-36 items-end gap-[3px]">
                {activity.map((height, i) => (
                  <motion.div
                    key={i}
                    className={`flex-1 rounded-sm ${
                      height > 85 ? "bg-[var(--danger)]" : "bg-border"
                    }`}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${height}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.015 }}
                  />
                ))}
              </div>

              <div className="mt-3 flex justify-between font-mono text-[11px] text-muted-foreground">
                <span>00:00</span>
                <span>23:00</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="border-t border-border bg-card">
            <h3 className="flex items-center gap-2 px-6 pt-6 text-[13px] font-medium text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              Recently quarantined
            </h3>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-2.5 font-medium">Time</th>
                    <th className="px-6 py-2.5 font-medium">Sender</th>
                    <th className="px-6 py-2.5 font-medium">Subject</th>
                    <th className="px-6 py-2.5 font-medium">Primary finding</th>
                    <th className="px-6 py-2.5 text-right font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {intercepted.map((row, i) => (
                    <motion.tr
                      key={row.sender}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.25, delay: i * 0.06 }}
                      className="border-b border-border last:border-0 transition-colors hover:bg-secondary/60"
                    >
                      <td className="whitespace-nowrap px-6 py-3.5 font-mono text-[12px] text-muted-foreground">
                        {row.time}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-[12px] text-foreground">
                        {row.sender}
                      </td>
                      <td className="max-w-[200px] truncate px-6 py-3.5 text-[13px] text-muted-foreground">
                        {row.subject}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-[13px] text-muted-foreground">
                        {row.type}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span className="inline-flex rounded-md bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-2 py-0.5 font-mono text-[12px] font-medium text-[var(--danger)]">
                          {row.score}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        <p className="mt-4 text-[13px] text-muted-foreground">
          Sample data shown for illustration.
        </p>
      </div>
    </section>
  );
}
