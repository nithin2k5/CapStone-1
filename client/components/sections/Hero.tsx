"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldAlert, Terminal, Activity } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

export default function Hero() {
  return (
    <section className="relative flex min-h-[90vh] items-center overflow-hidden border-b border-border pt-32 pb-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-10 lg:flex-row lg:gap-12">
          {/* ---------------- Left: typography ---------------- */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease }}
            className="w-full flex-1"
          >
            <div
              className="mb-8 inline-flex items-center gap-3 rounded-full border px-4 py-2"
              style={{
                borderColor: "color-mix(in srgb, var(--accent) 35%, var(--border))",
                background: "var(--accent-subtle)",
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-accent" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                Layer: post-delivery / anti-injection
              </span>
            </div>

            <h1 className="display mb-6 text-[2.75rem] text-foreground sm:text-[3.4rem] lg:text-[3.75rem]">
              The email you read is not the email your{" "}
              <span className="text-gradient">filter</span> reads.
            </h1>

            <p
              className="mb-10 max-w-2xl border-l-2 pl-5 text-[16px] leading-relaxed text-muted-foreground md:text-[17px]"
              style={{
                borderColor: "color-mix(in srgb, var(--accent-2) 60%, var(--border))",
              }}
            >
              Phishing filters now run on language models, so attackers write to
              the model instead of the victim &mdash; instructions hidden in
              markup the recipient never renders. This gateway scores the gap
              between the rendered message and the analysed one, and treats a
              confident &ldquo;safe&rdquo; verdict on a message carrying
              concealed instructions as the strongest signal it has.
            </p>

            <div className="flex w-full max-w-md flex-col items-stretch gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="btn-primary group flex-1 justify-between px-7 py-4 text-sm"
              >
                <span>Scan a mailbox</span>
                <Terminal className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              </Link>
              <Link
                href="/dashboard"
                className="btn-secondary group flex-1 justify-between px-7 py-4 text-sm"
              >
                <span>View console</span>
                <Activity className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              </Link>
            </div>
          </motion.div>

          {/* ---------------- Right: terminal ---------------- */}
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease }}
            className="mt-8 w-full flex-1 lg:mt-0 lg:max-w-xl"
          >
            <div
              className="panel-flush flex h-[500px] w-full flex-col font-mono text-[13px]"
              style={{ boxShadow: "var(--glow-3), var(--glow-accent)" }}
            >
              {/* Title bar */}
              <div className="flex shrink-0 items-center justify-between border-b border-border bg-secondary px-4 py-3.5">
                <div className="flex gap-2">
                  <span className="h-3 w-3 rounded-full bg-[var(--danger)]" />
                  <span className="h-3 w-3 rounded-full bg-[var(--warning)]" />
                  <span className="h-3 w-3 rounded-full bg-[var(--success)]" />
                </div>
                <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  root@gateway:~
                </span>
              </div>

              {/* Body */}
              <div className="relative flex flex-1 flex-col gap-4 overflow-hidden p-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-accent-2"
                >
                  &gt; scan --message 4417 &quot;Invoice overdue&quot;
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1 }}
                  className="text-muted-foreground"
                >
                  Headers [SPF/DKIM/DMARC]:{" "}
                  <span className="font-semibold text-[var(--success)]">PASS</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6 }}
                  className="text-muted-foreground"
                >
                  URLs, attachments:{" "}
                  <span className="font-semibold text-[var(--success)]">CLEAN</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.1 }}
                  className="text-muted-foreground"
                >
                  LLM verdict:{" "}
                  <span className="font-semibold text-[var(--success)]">
                    NOT PHISHING
                  </span>{" "}
                  <span className="text-muted-foreground">(12/100)</span>
                </motion.div>

                {/* The finding */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.9 }}
                  className="glow-danger mt-2 flex items-start gap-2.5 rounded-xl border p-3"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--danger) 40%, var(--border))",
                    background:
                      "color-mix(in srgb, var(--danger) 8%, transparent)",
                  }}
                >
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger)]" />
                  <span className="min-w-0">
                    <span className="font-bold text-[var(--danger)]">
                      71% OF BODY TEXT CONCEALED FROM READER
                    </span>
                    <br />
                    <span className="text-muted-foreground">
                      hidden span:{" "}
                      <span className="text-[var(--warning)]">
                        instruction override
                      </span>
                      ,{" "}
                      <span className="text-[var(--warning)]">
                        verdict forcing
                      </span>
                    </span>
                  </span>
                </motion.div>

                {/* Inversion */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 3.7 }}
                  className="font-bold uppercase leading-relaxed text-[var(--danger)]"
                >
                  &gt;&gt; Calm verdict inverted. Risk 12 &rarr; 84.
                  Quarantined.
                </motion.div>

                {/* Caret */}
                <div className="mt-auto flex items-center gap-2 text-accent">
                  <span className="animate-caret">_</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
