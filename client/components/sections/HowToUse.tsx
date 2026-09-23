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

const steps = [
  {
    title: "Create your account",
    description:
      "Register with an email and password, or sign in straight through Google or Microsoft. Sessions are JWT-backed and extend on activity.",
    icon: UserPlus,
    location: "/signup",
    gradient: "from-purple-500 to-indigo-500",
  },
  {
    title: "Connect a mailbox",
    description:
      "Authorise the gateway to read your inbox. It pulls recent messages with their raw headers, links, and attachments — nothing is sent or altered.",
    icon: Inbox,
    location: "/dashboard",
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    title: "Run a scan",
    description:
      "Hit Run Scan. Every message goes through header checks (SPF, DKIM, DMARC), URL reputation, attachment inspection, and the AI phishing model.",
    icon: ScanLine,
    location: "/dashboard",
    gradient: "from-blue-500 to-purple-500",
  },
  {
    title: "Read the verdicts",
    description:
      "Open any message to see its per-layer scores, the weighted risk total, and a plain-language explanation of exactly what tripped the detection.",
    icon: ListChecks,
    location: "/emails",
    gradient: "from-purple-500 via-indigo-500 to-blue-500",
  },
  {
    title: "Handle quarantine",
    description:
      "High-risk mail is suspended for manual review. Release anything caught by mistake, or delete confirmed phishing permanently.",
    icon: Lock,
    location: "/quarantine",
    gradient: "from-indigo-400 to-purple-400",
  },
  {
    title: "Tune and report",
    description:
      "Adjust detection sensitivity and alert preferences, watch the trends in Analytics, and export a CSV report of everything the gateway caught.",
    icon: SlidersHorizontal,
    location: "/settings",
    gradient: "from-blue-400 to-indigo-500",
  },
];

export default function HowToUse() {
  return (
    <section id="how-to-use" className="py-24 relative z-10 bg-black">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl md:text-5xl font-bold mb-6 text-foreground"
          >
            How to <span className="text-gradient">Use the Gateway</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg"
          >
            Six steps from signing up to a mailbox that screens itself.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -6 }}
              className="glass-card p-8 rounded-2xl relative overflow-hidden group border-indigo-500/20 hover:border-purple-500/50 hover:shadow-[0_0_35px_rgba(139,92,246,0.22)] transition-all duration-300 bg-neutral-950/90"
            >
              {/* Top accent gradient line */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${step.gradient} opacity-70 group-hover:opacity-100 transition-opacity`} />

              <span className="absolute top-6 right-8 font-heading text-5xl font-bold text-foreground/5 group-hover:text-purple-500/20 transition-colors select-none">
                {index + 1}
              </span>

              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-purple-500/10 border border-purple-500/30 group-hover:border-purple-400/60 shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all">
                <step.icon className="w-7 h-7 text-purple-400 group-hover:text-blue-300 transition-colors duration-300" />
              </div>

              <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-purple-300 transition-colors duration-300">
                {step.title}
              </h3>

              <p className="text-muted-foreground leading-relaxed group-hover:text-gray-300 transition-colors mb-5">
                {step.description}
              </p>

              <span className="inline-block font-mono text-xs tracking-wider text-[#00F0FF] bg-[#00F0FF]/10 border border-[#00F0FF]/20 rounded-md px-2 py-1">
                {step.location}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-16"
        >
          <Link
            href="/signup"
            className="w-full sm:w-auto px-6 py-3 font-bold bg-[#10B981] text-black hover:bg-foreground hover:text-background transition-colors rounded-lg flex items-center justify-center gap-2"
          >
            Start protecting your inbox
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/docs"
            className="w-full sm:w-auto px-6 py-3 font-bold text-[#00F0FF] border border-[#00F0FF]/40 hover:bg-[#00F0FF]/10 transition-colors rounded-lg flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Read the docs
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
