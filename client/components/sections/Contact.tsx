"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Mail, Terminal, BookOpen } from "lucide-react";
import { GithubIcon } from "@/components/ui/SocialIcons";

export default function Contact() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden border-t border-border py-24 sm:py-32"
    >
      {/* Framing wash */}
      <div
        className="pointer-events-none absolute -bottom-40 left-1/2 h-[420px] w-[min(1000px,110vw)] -translate-x-1/2 rounded-full blur-[140px] opacity-[0.1] dark:opacity-[0.2]"
        style={{ background: "var(--accent)" }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="panel-flush accent-rule hex-bg mx-auto max-w-4xl px-6 py-14 text-center sm:px-14"
          style={{ boxShadow: "var(--glow-3), var(--glow-accent)" }}
        >
          {/* Radar sweep behind the copy */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 opacity-40 dark:opacity-60"
          >
            {[0, 1, 2, 3].map((r) => (
              <span
                key={r}
                className="absolute rounded-full border"
                style={{
                  inset: `${r * 70}px`,
                  borderColor: "color-mix(in srgb, var(--accent) 18%, transparent)",
                }}
              />
            ))}
            <span
              className="animate-radar absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0 80%, color-mix(in srgb, var(--accent) 22%, transparent))",
                maskImage: "radial-gradient(circle, #000 60%, transparent 71%)",
                WebkitMaskImage: "radial-gradient(circle, #000 60%, transparent 71%)",
              }}
            />
          </div>

          <span className="eyebrow relative">
            <span className="h-px w-6 bg-accent" />
            get started
          </span>

          <h2 className="display relative mt-5 text-[2rem] text-foreground sm:text-[2.7rem]">
            Ready to secure your{" "}
            <span className="text-gradient">infrastructure?</span>
          </h2>

          <p className="relative mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
            Connect an inbox to run all five analysers over real mail, or read the
            benchmark method and the case against over-reading its numbers.
          </p>

          <div className="relative mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary px-6 py-3.5 text-sm">
              <Terminal className="h-4 w-4" />
              Create an account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/docs" className="btn-secondary px-6 py-3.5 text-sm">
              <BookOpen className="h-4 w-4" />
              Read the benchmarks
            </Link>
          </div>

          <div className="relative mt-12 grid gap-px overflow-hidden rounded-xl border border-border sm:grid-cols-2"
            style={{ background: "var(--border)" }}
          >
            <a
              href="mailto:security@gateway.local"
              className="group flex items-center justify-center gap-3 bg-card px-5 py-4 transition-colors hover:bg-secondary"
            >
              <span className="chip h-9 w-9 shrink-0">
                <Mail className="h-4 w-4" />
              </span>
              <span className="text-left">
                <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  email
                </span>
                <span className="block font-mono text-[13px] text-foreground">
                  security@gateway.local
                </span>
              </span>
            </a>

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-center gap-3 bg-card px-5 py-4 transition-colors hover:bg-secondary"
            >
              <span className="chip chip-2 h-9 w-9 shrink-0">
                <GithubIcon />
              </span>
              <span className="text-left">
                <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  source
                </span>
                <span className="block font-mono text-[13px] text-foreground">
                  issues and method
                </span>
              </span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
