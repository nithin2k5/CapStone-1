"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, X, Mail } from "lucide-react";

type ScanCheck = { label: string; value: string; ok: boolean };
type Sample = {
  from: string;
  subject: string;
  checks: ScanCheck[];
  verdict: "SAFE" | "QUARANTINED";
  score: number;
};

// Illustrative messages, not live data: the panel shows what a scan looks
// like before the visitor has a mailbox connected.
const SAMPLES: Sample[] = [
  {
    from: "billing@invoice-portal.co",
    subject: "Invoice #4471 is overdue",
    checks: [
      { label: "SPF / DKIM", value: "fail", ok: false },
      { label: "hidden text", value: "38% of body", ok: false },
      { label: "concealment", value: "white-on-white", ok: false },
      { label: "instruction", value: "ignore previous", ok: false },
      { label: "probe Δ", value: "64 pts", ok: false },
    ],
    verdict: "QUARANTINED",
    score: 87,
  },
  {
    from: "updates@acme-cloud.io",
    subject: "Your weekly usage summary",
    checks: [
      { label: "SPF / DKIM", value: "pass", ok: true },
      { label: "hidden text", value: "0%", ok: true },
      { label: "link targets", value: "match", ok: true },
      { label: "attachments", value: "none", ok: true },
      { label: "probe Δ", value: "2 pts", ok: true },
    ],
    verdict: "SAFE",
    score: 4,
  },
];

const STEP_MS = 650;
const HOLD_STEPS = 5;

/** A looping scan readout for the auth pages' side panel. */
export function AuthShowcase() {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setTick((t) => t + 1), STEP_MS);
    return () => window.clearInterval(id);
  }, [reduce]);

  const perSample = SAMPLES[0].checks.length + 1 + HOLD_STEPS;
  const index = reduce ? 0 : Math.floor(tick / perSample) % SAMPLES.length;
  const sample = SAMPLES[index];
  const step = reduce ? Infinity : tick % perSample;
  const done = step > sample.checks.length;
  const safe = sample.verdict === "SAFE";
  const tone = safe ? "var(--success)" : "var(--danger)";

  return (
    <div className="brackets panel-flush relative w-full max-w-[440px] p-6">
      <div className="scan-layer" />
      <div className="relative z-[2]">
        <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            inbound scan
          </span>
          <span>sample</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3.5">
              <span className="chip h-9 w-9 shrink-0">
                <Mail className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="truncate font-mono text-[12px] text-muted-foreground">{sample.from}</div>
                <div className="truncate text-[14px] font-semibold text-foreground">{sample.subject}</div>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {sample.checks.map((c, i) => {
                const shown = step > i;
                const color = c.ok ? "var(--success)" : "var(--danger)";
                return (
                  <li
                    key={c.label}
                    className="flex items-center gap-3 font-mono text-[12px] transition-opacity duration-300"
                    style={{ opacity: shown ? 1 : 0.25 }}
                  >
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-md border"
                      style={
                        shown
                          ? {
                              color,
                              borderColor: `color-mix(in srgb, ${color} 35%, var(--border))`,
                              background: `color-mix(in srgb, ${color} 10%, transparent)`,
                            }
                          : { borderColor: "var(--border)" }
                      }
                    >
                      {shown && (c.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />)}
                    </span>
                    <span className="w-28 text-muted-foreground">{c.label}</span>
                    <span className="truncate" style={{ color: shown ? color : "var(--muted-foreground)" }}>
                      {shown ? c.value : "…"}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div
              className="mt-5 flex items-center justify-between rounded-xl border px-4 py-3 transition-all duration-500"
              style={
                done
                  ? {
                      borderColor: `color-mix(in srgb, ${tone} 40%, var(--border))`,
                      background: `color-mix(in srgb, ${tone} 9%, transparent)`,
                    }
                  : { borderColor: "var(--border)" }
              }
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: done ? tone : "var(--muted-foreground)" }}>
                {done ? sample.verdict : "analysing…"}
              </span>
              <span className="display text-[1.5rem] leading-none" style={{ color: done ? tone : "var(--muted-foreground)" }}>
                {done ? sample.score : "—"}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
