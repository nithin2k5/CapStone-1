"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  UserPlus,
  Inbox,
  ScanLine,
  ListChecks,
  Lock,
  SlidersHorizontal,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import SectionHeading from "./SectionHeading";

const steps = [
  {
    title: "Create your account",
    description:
      "Register with an email and password, or sign in through Google or Microsoft. Sessions are JWT-backed and extend on activity.",
    icon: UserPlus,
    location: "/signup",
  },
  {
    title: "Connect a mailbox",
    description:
      "Authorise the gateway to read your inbox. It pulls recent messages with their raw headers, links, and attachments — nothing is sent or altered.",
    icon: Inbox,
    location: "/dashboard",
  },
  {
    title: "Run a scan",
    description:
      "Every message goes through header checks (SPF, DKIM, DMARC), URL reputation, attachment inspection, and the content model.",
    icon: ScanLine,
    location: "/dashboard",
  },
  {
    title: "Read the verdicts",
    description:
      "Open any message to see its per-layer scores, the weighted risk total, and a plain-language explanation of what tripped the detection.",
    icon: ListChecks,
    location: "/emails",
  },
  {
    title: "Handle quarantine",
    description:
      "High-risk mail is suspended for manual review. Release anything caught by mistake, or delete confirmed phishing permanently.",
    icon: Lock,
    location: "/quarantine",
  },
  {
    title: "Tune and report",
    description:
      "Adjust detection sensitivity and alert preferences, watch the trends in Analytics, and export a CSV of everything the gateway caught.",
    icon: SlidersHorizontal,
    location: "/settings",
  },
];

export default function HowToUse() {
  return (
    <section
      id="how-to-use"
      className="border-t border-border bg-secondary/40 py-24 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Getting started"
          title="Six steps to a mailbox that screens itself"
          description="From signing up to tuning thresholds, the whole workflow runs in the browser."
        />

        <ol className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35, delay: (i % 3) * 0.07 }}
              className="glass-card group flex flex-col p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors group-hover:border-accent/40 group-hover:bg-[var(--accent-subtle)] group-hover:text-accent">
                  <step.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="font-mono text-[13px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              <h3 className="mt-5 text-[15px] font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>

              <span className="token mt-5 self-start">{step.location}</span>
            </motion.li>
          ))}
        </ol>

        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn-primary px-5 py-3 text-sm">
            Start protecting your inbox
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/docs" className="btn-secondary px-5 py-3 text-sm">
            <BookOpen className="h-4 w-4" />
            Read the docs
          </Link>
        </div>
      </div>
    </section>
  );
}
