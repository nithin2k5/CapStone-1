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
      "Every message goes through header checks, URL reputation, attachment inspection, the content model, and the perceptual layer.",
    icon: ScanLine,
    location: "/dashboard",
  },
  {
    title: "Read the verdicts",
    description:
      "Open any message to see each analyser's score, how the evidence composed, and a plain-language account of what tripped detection.",
    icon: ListChecks,
    location: "/emails",
  },
  {
    title: "Handle quarantine",
    description:
      "Mail scoring above 60 is suspended for manual review. Release anything caught by mistake, or delete confirmed phishing permanently.",
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
      className="relative border-y border-border bg-secondary/40 py-24 sm:py-32"
    >
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Getting started"
          title={
            <>
              How to <span className="text-gradient">use the gateway</span>
            </>
          }
          description="Six steps from signing up to a mailbox that screens itself."
        />

        <ol className="relative mt-16 grid gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group relative flex flex-col"
            >
              {/* Step rail: numbered node and a beam running to the next one */}
              <div className="mb-5 flex items-center gap-3">
                <span
                  className="glow-accent relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border font-mono text-[13px] font-bold text-accent"
                  style={{
                    borderColor: "color-mix(in srgb, var(--accent) 45%, var(--border))",
                    background: "var(--accent-subtle)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="relative h-px flex-1 overflow-hidden bg-border">
                  <span
                    className="animate-beam absolute inset-y-0 left-0 w-1/4"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, var(--accent), transparent)",
                      animationDelay: `${i * 0.4}s`,
                    }}
                  />
                </span>
              </div>

              <div className="panel-lift accent-rule relative flex flex-1 flex-col overflow-hidden p-6">
                <div className="flex items-center gap-3">
                  <span className="chip h-10 w-10 shrink-0">
                    <step.icon className="h-[18px] w-[18px]" />
                  </span>
                  <h3 className="display text-[16.5px] text-foreground">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-4 flex-1 text-[14px] leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
                <span className="token mt-5 self-start">{step.location}</span>
              </div>
            </motion.li>
          ))}
        </ol>

        <div className="mt-14 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn-primary px-6 py-3.5 text-sm">
            Start protecting your inbox
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/docs" className="btn-secondary px-6 py-3.5 text-sm">
            <BookOpen className="h-4 w-4" />
            Read the docs
          </Link>
        </div>
      </div>
    </section>
  );
}
