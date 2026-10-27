"use client";

import { motion } from "framer-motion";
import {
  Server,
  Scan,
  Eye,
  Bot,
  Gauge,
  Database,
  LayoutDashboard,
  ArrowDown,
} from "lucide-react";
import SectionHeading from "./SectionHeading";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * `weight` is RiskEngine.RELIABILITY — the ceiling a maxed-out finding from
 * that analyser alone can reach. These are not shares of a total: the engine
 * composes them as independent evidence, so they do not sum to 1.
 */
const analysers = [
  { name: "Header", detail: "SPF · DKIM · DMARC", weight: "0.90" },
  { name: "URL", detail: "Reputation · homograph", weight: "0.85" },
  { name: "Attachment", detail: "Type · macro · archive", weight: "0.90" },
  { name: "Content", detail: "LLM classification", weight: "0.80" },
  { name: "Perceptual", detail: "Channel divergence", weight: "0.85" },
];

/** A labelled node in the pipeline. */
function Node({
  icon: Icon,
  title,
  detail,
  tone = "accent",
  delay = 0,
}: {
  icon: typeof Server;
  title: string;
  detail: string;
  tone?: "accent" | "accent-2";
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay, ease }}
      className="panel brackets flex items-center gap-4 px-5 py-4"
    >
      <span className={`chip h-10 w-10 shrink-0 ${tone === "accent-2" ? "chip-2" : ""}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-foreground">{title}</div>
        <div className="mt-0.5 font-mono text-[11.5px] text-muted-foreground">
          {detail}
        </div>
      </div>
    </motion.div>
  );
}

/** Vertical connector between stages: a dashed rail with a packet riding it. */
function Flow({ label }: { label?: string }) {
  return (
    <div aria-hidden className="relative flex flex-col items-center py-2">
      <svg width="12" height="44" viewBox="0 0 12 44" className="overflow-visible">
        <line
          x1="6"
          y1="0"
          x2="6"
          y2="44"
          stroke="var(--accent)"
          strokeOpacity="0.55"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          className="animate-dash"
        />
        <circle r="3" cx="6" fill="var(--accent-2)" style={{ filter: "drop-shadow(0 0 4px var(--accent-2))" }}>
          <animate attributeName="cy" from="0" to="44" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" dur="1.8s" repeatCount="indefinite" />
        </circle>
      </svg>
      {label && (
        <span className="mt-1 rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
      )}
      <ArrowDown className="mt-1 h-3.5 w-3.5 text-accent" />
    </div>
  );
}

export default function Architecture() {
  return (
    <section
      id="architecture"
      className="relative border-y border-border bg-secondary/40 py-24 sm:py-32"
    >
      <div className="hex-bg pointer-events-none absolute inset-0 opacity-70" />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-[480px] w-[min(720px,90vw)] -translate-x-1/2 rounded-full blur-[150px] opacity-[0.08] dark:opacity-[0.16]"
        style={{ background: "var(--accent-solid)" }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Architecture"
          tone="accent-2"
          title={
            <>
              System <span className="text-gradient-blue">architecture</span>
            </>
          }
          description="The gateway reads mail after delivery over the provider API, so it never sits in the send path. One message becomes two documents — and every layer downstream sees both."
        />

        <div className="mx-auto mt-16 max-w-3xl">
          <Node
            icon={Server}
            title="Gmail / Microsoft Graph"
            detail="read-only · after delivery"
          />

          <Flow label="raw rfc 5322" />

          <Node
            icon={Scan}
            title="Dual-channel parser"
            detail="one message, two documents"
          />

          {/* ---- The fork: this is the thesis of the project ---- */}
          <div aria-hidden className="relative h-10">
            <span className="rule-fade-y absolute left-1/2 top-0 h-5 w-px -translate-x-1/2" />
            <span
              className="absolute left-1/4 right-1/4 top-5 h-px"
              style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))", opacity: 0.6 }}
            />
            <span
              className="absolute left-1/4 top-5 h-5 w-px"
              style={{ background: "var(--accent)", opacity: 0.6 }}
            />
            <span
              className="absolute right-1/4 top-5 h-5 w-px"
              style={{ background: "var(--accent-2)", opacity: 0.6 }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, ease }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div
              className="panel glow-accent p-5"
              style={{
                borderColor: "color-mix(in srgb, var(--accent) 38%, var(--border))",
              }}
            >
              <div className="flex items-center gap-2.5">
                <Eye className="h-4 w-4 text-accent" />
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
                  rendered channel
                </span>
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
                What the recipient actually sees once the mail client applies the
                CSS and collapses the markup.
              </p>
            </div>

            <div
              className="panel glow-accent-2 p-5"
              style={{
                borderColor: "color-mix(in srgb, var(--accent-2) 38%, var(--border))",
              }}
            >
              <div className="flex items-center gap-2.5">
                <Bot className="h-4 w-4 text-accent-2" />
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-2">
                  machine channel
                </span>
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
                What a classifier ingests — including the 24 concealment channels
                the reader never renders.
              </p>
            </div>
          </motion.div>

          <Flow label="both documents" />

          {/* ---- Analysers in parallel ---- */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, ease }}
            className="panel accent-rule overflow-hidden p-6"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[14px] font-semibold text-foreground">
                Analysis layers
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
                independent evidence · reliability ceiling
              </span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {analysers.map((a, i) => (
                <motion.div
                  key={a.name}
                  initial={{ opacity: 0, scale: 0.97 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  className="group rounded-xl border border-border bg-elevated px-4 py-3.5 transition-colors hover:border-accent/50"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13.5px] font-semibold text-foreground">
                      {a.name}
                    </span>
                    <span className="font-mono text-[11px] text-accent">
                      {a.weight}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {a.detail}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <Flow label="weighted evidence" />

          {/* Risk engine, with the inversion called out */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, ease }}
            className="panel glow-accent overflow-hidden"
            style={{
              borderColor: "color-mix(in srgb, var(--accent) 38%, var(--border))",
            }}
          >
            <div className="flex items-center gap-4 px-5 py-4">
              <span className="chip h-10 w-10 shrink-0">
                <Gauge className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-foreground">
                  Risk engine
                </div>
                <div className="mt-0.5 font-mono text-[11.5px] text-muted-foreground">
                  P(malicious) = 1 − Π(1 − eᵢ)
                </div>
              </div>
            </div>

            <div
              className="border-t px-5 py-3.5"
              style={{
                borderColor: "color-mix(in srgb, var(--accent) 20%, var(--border))",
                background: "var(--accent-subtle)",
              }}
            >
              <p className="font-mono text-[11.5px] leading-relaxed text-muted-foreground">
                <span className="text-accent">if</span> concealed instructions{" "}
                <span className="text-accent">and</span> content verdict is calm{" "}
                <span className="text-accent">then</span> add evidence term 0.75
              </p>
            </div>
          </motion.div>

          <Flow />

          <div className="grid gap-4 sm:grid-cols-2">
            <Node
              icon={Database}
              title="Quarantine + store"
              detail="suspended for review"
              tone="accent-2"
              delay={0}
            />
            <Node
              icon={LayoutDashboard}
              title="Analyst dashboard"
              detail="verdict with evidence"
              tone="accent-2"
              delay={0.08}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
