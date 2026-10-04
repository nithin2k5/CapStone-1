"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, ShieldAlert } from "lucide-react";

const scanLines = [
  { label: "SPF, DKIM, DMARC", value: "pass", tone: "ok" },
  { label: "URLs, attachments", value: "clean", tone: "ok" },
  { label: "Content model verdict", value: "not phishing · 12/100", tone: "ok" },
] as const;

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Post-delivery analysis · prompt-injection aware
            </span>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem]">
              The email you read is not the email your filter reads.
            </h1>

            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
              Phishing filters now run on language models, so attackers write to
              the model instead of the victim — instructions hidden in markup the
              recipient never renders. This gateway scores the gap between the
              rendered message and the analysed one, and treats a confident
              &ldquo;safe&rdquo; verdict on a message carrying concealed
              instructions as the strongest signal it has.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="btn-primary px-5 py-3 text-sm">
                Scan a mailbox
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/docs" className="btn-secondary px-5 py-3 text-sm">
                <BookOpen className="h-4 w-4" />
                Read the method
              </Link>
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-border pt-8">
              {[
                { v: "44%", k: "of verdicts flipped by hidden text, unguarded" },
                { v: "0%", k: "flipped with divergence analysis on" },
                { v: "112", k: "matched attack/control pairs measured" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="font-mono text-2xl font-semibold tracking-tight text-foreground">
                    {s.v}
                  </dt>
                  <dd className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
                    {s.k}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>

          {/* Verdict panel */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            <div className="glass overflow-hidden shadow-[0_24px_60px_-28px_rgba(15,23,42,0.22)] dark:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]">
              {/* Panel header */}
              <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary px-4 py-3">
                <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  message 4417
                </div>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  &ldquo;Invoice overdue&rdquo;
                </span>
              </div>

              {/* Layer results */}
              <div className="divide-y divide-border">
                {scanLines.map((line, i) => (
                  <motion.div
                    key={line.label}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + i * 0.22, duration: 0.3 }}
                    className="flex items-center justify-between gap-4 px-4 py-3.5"
                  >
                    <span className="text-[13px] text-muted-foreground">
                      {line.label}
                    </span>
                    <span className="font-mono text-[13px] font-medium text-[var(--success)]">
                      {line.value}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* The finding that overturns it */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.15, duration: 0.35 }}
                className="border-t border-border bg-[color-mix(in_srgb,var(--danger)_7%,transparent)] px-4 py-4"
              >
                <div className="flex gap-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger)]" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">
                      71% of body text concealed from the reader
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      Hidden span classified as{" "}
                      <span className="font-mono text-[12px] text-foreground">
                        instruction override
                      </span>{" "}
                      and{" "}
                      <span className="font-mono text-[12px] text-foreground">
                        verdict forcing
                      </span>
                      .
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Final action */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.45, duration: 0.3 }}
                className="flex items-center justify-between gap-4 border-t border-border px-4 py-3.5"
              >
                <span className="text-[13px] text-muted-foreground">
                  Risk score
                </span>
                <span className="flex items-center gap-2 font-mono text-[13px]">
                  <span className="text-muted-foreground line-through">12</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-semibold text-[var(--danger)]">84</span>
                  <span className="ml-1 rounded-md bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--danger)]">
                    quarantined
                  </span>
                </span>
              </motion.div>
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Illustrative verdict from the benchmark corpus.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
