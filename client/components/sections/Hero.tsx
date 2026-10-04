"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Terminal, Activity, ShieldAlert } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

type TraceRow =
  | { kind: "prompt"; t: number; text: string }
  | { kind: "result"; t: number; label: string; value: string; tone: "ok" | "bad" };

const trace: TraceRow[] = [
  { kind: "prompt", t: 0.5, text: "scan --message 4417 --explain" },
  { kind: "result", t: 0.9, label: "headers  spf/dkim/dmarc", value: "pass", tone: "ok" },
  { kind: "result", t: 1.2, label: "urls, attachments", value: "clean", tone: "ok" },
  { kind: "result", t: 1.5, label: "content model", value: "not phishing  12/100", tone: "ok" },
  { kind: "result", t: 1.8, label: "perceptual divergence", value: "71% concealed", tone: "bad" },
];

const metrics = [
  { value: "44%", label: "of verdicts flipped by text the reader never saw" },
  { value: "0%", label: "flipped once divergence analysis is watching" },
  { value: "112", label: "matched attack / control pairs measured" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-16 lg:grid-cols-[1.02fr_1fr] lg:gap-14">
          {/* ---- Copy ---- */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
          >
            <div className="inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5"
              style={{
                borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border))",
                background: "var(--accent-subtle)",
              }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-accent" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                post-delivery · anti-injection
              </span>
            </div>

            <h1 className="display mt-7 text-[2.6rem] text-foreground sm:text-[3.4rem] lg:text-[3.9rem]">
              The email you read is not the email your{" "}
              <span className="text-gradient">filter</span> reads.
            </h1>

            <p className="mt-7 max-w-xl border-l-2 pl-5 text-[16px] leading-relaxed text-muted-foreground"
              style={{ borderColor: "color-mix(in srgb, var(--accent-2) 55%, var(--border))" }}
            >
              Phishing filters now run on language models, so attackers write to
              the model instead of the victim — instructions hidden in markup the
              recipient never renders. This gateway scores the gap between the
              rendered message and the analysed one, and treats a confident
              &ldquo;safe&rdquo; verdict on a message carrying concealed
              instructions as the strongest signal it has.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="btn-primary px-6 py-3.5 text-sm">
                <Terminal className="h-4 w-4" />
                Scan a mailbox
              </Link>
              <Link href="/dashboard" className="btn-secondary px-6 py-3.5 text-sm">
                <Activity className="h-4 w-4" />
                View the console
              </Link>
            </div>

            {/* Headline numbers */}
            <dl className="mt-14 grid max-w-xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border sm:grid-cols-3"
              style={{ background: "var(--border)" }}
            >
              {metrics.map((m, i) => (
                <motion.div
                  key={m.value}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.12, duration: 0.4 }}
                  className="bg-card px-5 py-5"
                >
                  <dt className="display text-gradient text-3xl">{m.value}</dt>
                  <dd className="mt-2 text-[12.5px] leading-snug text-muted-foreground">
                    {m.label}
                  </dd>
                </motion.div>
              ))}
            </dl>
          </motion.div>

          {/* ---- Live trace panel ---- */}
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease }}
            className="w-full"
          >
            <div
              className="panel-flush font-mono"
              style={{ boxShadow: "var(--glow-3), var(--glow-accent)" }}
            >
              {/* Title bar */}
              <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--warning)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)]" />
                </div>
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  gateway · trace
                </span>
              </div>

              {/* Trace body */}
              <div className="space-y-3 px-5 py-5 text-[13px]">
                {trace.map((row) =>
                  row.kind === "prompt" ? (
                    <motion.div
                      key={row.text}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: row.t, duration: 0.3 }}
                      className="flex items-center gap-2 text-accent-2"
                    >
                      <span className="text-muted-foreground">$</span>
                      {row.text}
                    </motion.div>
                  ) : (
                    <motion.div
                      key={row.label}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: row.t, duration: 0.3 }}
                      className="flex items-baseline justify-between gap-4"
                    >
                      <span className="text-muted-foreground">{row.label}</span>
                      <span
                        className="shrink-0 font-medium"
                        style={{
                          color:
                            row.tone === "ok"
                              ? "var(--success)"
                              : "var(--danger)",
                        }}
                      >
                        {row.value}
                      </span>
                    </motion.div>
                  )
                )}

                {/* The finding */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.2, duration: 0.4 }}
                  className="glow-danger mt-4 rounded-xl border p-3.5"
                  style={{
                    borderColor: "color-mix(in srgb, var(--danger) 35%, var(--border))",
                    background: "color-mix(in srgb, var(--danger) 7%, transparent)",
                  }}
                >
                  <div className="flex gap-2.5">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger)]" />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        hidden span → analyser, not reader
                      </p>
                      <p className="mt-1.5 leading-relaxed text-muted-foreground">
                        classified{" "}
                        <span className="text-[var(--warning)]">
                          instruction override
                        </span>{" "}
                        +{" "}
                        <span className="text-[var(--warning)]">
                          verdict forcing
                        </span>
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Inversion */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.6, duration: 0.4 }}
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"
                >
                  <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    calm verdict inverted
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground line-through">12</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-base font-bold text-[var(--danger)]">84</span>
                    <span
                      className="pill"
                      style={{
                        borderColor: "color-mix(in srgb, var(--danger) 35%, var(--border))",
                        background: "color-mix(in srgb, var(--danger) 12%, transparent)",
                        color: "var(--danger)",
                      }}
                    >
                      quarantined
                    </span>
                  </span>
                </motion.div>
              </div>
            </div>

            <p className="mt-3.5 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              trace replayed from the benchmark corpus
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
