"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Check,
  Copy,
  GitBranch,
  KeyRound,
  Package,
  PlayCircle,
  MailCheck,
  Terminal,
  ExternalLink,
} from "lucide-react";

const steps = [
  {
    title: "Clone the repository",
    description: "Grab the source. The repo holds both the FastAPI backend and this Next.js client.",
    icon: GitBranch,
    commands: ["git clone https://github.com/nithin2k5/CapStone-1.git", "cd CapStone-1"],
  },
  {
    title: "Configure the environment",
    description:
      "Copy the backend template, then set JWT_SECRET, DATABASE_URL and your Google OAuth credentials. The client needs its own NEXT_PUBLIC_GOOGLE_CLIENT_ID for the sign-in button.",
    icon: KeyRound,
    commands: [
      "cp server/.env.example server/.env",
      "echo 'NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id' > client/.env",
    ],
  },
  {
    title: "Install dependencies",
    description: "Python 3.13+ for the gateway, Node 20+ for the dashboard.",
    icon: Package,
    commands: [
      "python -m venv server/.venv && source server/.venv/bin/activate",
      "pip install -r server/requirements.txt",
      "npm install --prefix client",
    ],
  },
  {
    title: "Start both services",
    description:
      "One script boots the API on port 8000 and the dashboard on port 3000. Prefer containers? Run docker compose up --build inside server/ instead.",
    icon: PlayCircle,
    commands: ["./start-all.sh"],
  },
  {
    title: "Create an account and scan",
    description:
      "Register from the dashboard, connect a Google or Microsoft mailbox, then trigger the first scan. Verdicts land in Threats and Quarantine as the engine works through the inbox.",
    icon: MailCheck,
    commands: [],
  },
];

const endpoints = [
  { label: "Dashboard", href: "http://localhost:3000", detail: "Next.js client" },
  { label: "API docs", href: "http://localhost:8000/docs", detail: "Swagger / OpenAPI" },
];

function CommandLine({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is unavailable (insecure origin or denied permission) — the
      // command stays selectable, so there is nothing to recover from here.
    }
  };

  return (
    <div className="group/cmd flex items-center gap-3 rounded-lg border border-indigo-500/20 bg-black/60 px-4 py-3 font-mono text-sm hover:border-indigo-500/40 transition-colors">
      <span className="text-[#10B981] select-none">$</span>
      <code className="flex-1 text-gray-300 break-all">{command}</code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Command copied" : `Copy command: ${command}`}
        className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-[#00F0FF] hover:bg-[#00F0FF]/10 transition-colors"
      >
        {copied ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function Setup() {
  return (
    <section id="setup" className="py-24 relative z-10 bg-black">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl md:text-5xl font-bold mb-6 text-foreground"
          >
            Set Up the <span className="text-gradient">Gateway</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg"
          >
            Five steps from a clean machine to a running gateway scanning live mail.
          </motion.p>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="glass-card p-6 md:p-8 rounded-2xl border border-indigo-500/20 hover:border-purple-500/50 hover:shadow-[0_0_25px_rgba(139,92,246,0.2)] transition-all bg-neutral-950/90"
            >
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                  <step.icon className="w-6 h-6 text-purple-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono tracking-wider mb-2 uppercase font-bold text-purple-400">
                    Step {index + 1} / {steps.length}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">{step.description}</p>

                  {step.commands.length > 0 && (
                    <div className="space-y-2">
                      {step.commands.map((command) => (
                        <CommandLine key={command} command={command} />
                      ))}
                    </div>
                  )}

                  {index === steps.length - 1 && (
                    <Link
                      href="/signup"
                      className="inline-flex items-center gap-2 px-4 py-2 font-bold bg-[#10B981] text-black hover:bg-foreground hover:text-background transition-colors rounded-lg"
                    >
                      <Terminal className="w-4 h-4" />
                      Create an account
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid sm:grid-cols-2 gap-4 pt-2"
          >
            {endpoints.map((endpoint) => (
              <Link
                key={endpoint.href}
                href={endpoint.href}
                target="_blank"
                rel="noreferrer"
                className="glass-card p-5 rounded-2xl border border-indigo-500/20 hover:border-[#00F0FF]/50 transition-all bg-neutral-950/90 group/link"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground mb-1">{endpoint.label}</div>
                    <div className="font-mono text-xs text-[#00F0FF] truncate">{endpoint.href}</div>
                  </div>
                  <ExternalLink className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover/link:text-[#00F0FF] transition-colors" />
                </div>
                <div className="text-xs text-muted-foreground mt-2">{endpoint.detail}</div>
              </Link>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
