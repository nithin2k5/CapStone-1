"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { GithubIcon } from "@/components/ui/SocialIcons";

export default function Contact() {
  return (
    <section
      id="contact"
      className="border-t border-border bg-secondary/40 py-24 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4 }}
          className="glass mx-auto max-w-3xl p-8 text-center sm:p-12"
        >
          <span className="eyebrow">Get in touch</span>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Point it at a mailbox and see what it finds
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
            Connect an inbox to run the analysers over real mail, or read the
            benchmark method and the arguments against over-reading its numbers.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary px-5 py-3 text-sm">
              Create an account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/docs" className="btn-secondary px-5 py-3 text-sm">
              Read the benchmarks
            </Link>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-5 border-t border-border pt-8 text-sm sm:flex-row sm:gap-8">
            <a
              href="mailto:security@gateway.local"
              className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Mail className="h-4 w-4" />
              <span className="font-mono text-[13px]">
                security@gateway.local
              </span>
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <GithubIcon />
              <span className="text-[13px]">Source and issues</span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
