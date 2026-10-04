"use client";

import { motion } from "framer-motion";
import {
  Server,
  ShieldAlert,
  Database,
  Scan,
  LayoutDashboard,
  Gauge,
} from "lucide-react";
import SectionHeading from "./SectionHeading";

const pipeline = [
  {
    name: "Gmail / Microsoft Graph",
    icon: Server,
    note: "Read-only, after delivery",
  },
  { name: "FastAPI service", icon: LayoutDashboard, note: "Async request layer" },
  {
    name: "Dual-channel parser",
    icon: Scan,
    note: "Rendered text vs. machine-visible text",
  },
];

const analysers = [
  "Header analyser",
  "URL scanner",
  "Attachment scanner",
  "LLM content analyser",
  "Perceptual analyser",
];

const downstream = [
  { name: "Risk engine", icon: Gauge, note: "Weighted, capped composition" },
  { name: "Quarantine and store", icon: Database, note: "Suspended for review" },
  { name: "Analyst dashboard", icon: ShieldAlert, note: "Verdict with evidence" },
];

function Step({
  name,
  note,
  icon: Icon,
  index,
}: {
  name: string;
  note: string;
  icon: typeof Server;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="glass-card flex items-center gap-4 px-5 py-4"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{name}</div>
        <div className="mt-0.5 text-[13px] text-muted-foreground">{note}</div>
      </div>
    </motion.div>
  );
}

function Connector() {
  return (
    <div aria-hidden className="flex justify-center py-2">
      <span className="h-6 w-px bg-border" />
    </div>
  );
}

export default function Architecture() {
  return (
    <section
      id="architecture"
      className="border-t border-border bg-secondary/40 py-24 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Architecture"
          title="How a message moves through the gateway"
          description="The gateway reads mail after delivery over the provider API, so it never sits in the send path. The parser splits each message into what the recipient renders and what the model ingests; every layer downstream sees both."
        />

        <div className="mx-auto mt-14 max-w-xl">
          {pipeline.map((step, i) => (
            <div key={step.name}>
              <Step {...step} index={i} />
              <Connector />
            </div>
          ))}

          {/* Analysis layers run in parallel */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.35 }}
            className="glass-card p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">
                Analysis layers
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                run in parallel
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {analysers.map((name) => (
                <div
                  key={name}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] text-muted-foreground"
                >
                  {name}
                </div>
              ))}
            </div>
          </motion.div>

          <Connector />

          {downstream.map((step, i) => (
            <div key={step.name}>
              <Step {...step} index={i} />
              {i < downstream.length - 1 && <Connector />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
