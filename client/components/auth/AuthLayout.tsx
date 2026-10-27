"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import GoogleAuthProvider from "@/components/auth/GoogleAuthProvider";
import { AuthShowcase } from "@/components/auth/AuthShowcase";

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="chip h-9 w-9 rounded-xl transition-transform group-hover:scale-105">
        <ShieldCheck className="h-[18px] w-[18px]" />
      </span>
      <span className="font-display text-[15px] font-bold tracking-tight text-foreground">
        Secure Email Gateway
      </span>
    </Link>
  );
}

/**
 * Split screen for every signed-out page: a scan readout on the left that
 * shows what the product does, and the form on the right. Below `lg` the
 * readout drops away and the form takes the full width.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <GoogleAuthProvider>
      <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <aside className="relative hidden overflow-hidden border-r border-border lg:flex lg:flex-col">
          <div
            aria-hidden
            className="hex-bg absolute inset-0"
            style={{
              maskImage: "radial-gradient(90% 70% at 40% 40%, #000 30%, transparent 85%)",
              WebkitMaskImage: "radial-gradient(90% 70% at 40% 40%, #000 30%, transparent 85%)",
            }}
          />
          <div
            aria-hidden
            className="absolute -left-32 top-1/4 h-[460px] w-[460px] rounded-full opacity-[0.16] blur-[140px] dark:opacity-[0.32]"
            style={{ background: "var(--accent-solid)" }}
          />
          <div
            aria-hidden
            className="absolute -bottom-24 right-0 h-[360px] w-[360px] rounded-full opacity-[0.08] blur-[140px] dark:opacity-[0.2]"
            style={{ background: "var(--accent-2)" }}
          />

          <div className="relative z-10 flex flex-1 flex-col px-12 py-10 xl:px-16">
            <Logo />

            <div className="flex flex-1 flex-col justify-center py-12">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="eyebrow">
                  <span className="h-px w-6 bg-accent" />
                  dual-channel analysis
                </span>
                <h2 className="display mt-4 max-w-md text-[2.6rem] text-foreground xl:text-[3rem]">
                  What you read, and what the{" "}
                  <span className="text-gradient">machine reads</span>.
                </h2>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                  Every message is scored twice: once as the recipient sees it, once as
                  an AI assistant would ingest it. Text hidden between the two is where
                  injections live.
                </p>
              </motion.div>

              <motion.div
                className="mt-10"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
              >
                <AuthShowcase />
              </motion.div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
              <span>24 concealment channels</span>
              <span>SPF · DKIM · DMARC</span>
              <span>Gmail &amp; Outlook</span>
            </div>
          </div>
        </aside>

        <main className="relative flex flex-col px-5 py-6 sm:px-10 lg:px-14 lg:py-10">
          <div className="flex items-center justify-between">
            <div className="lg:invisible">
              <Logo />
            </div>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center py-10">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="w-full max-w-[420px]"
            >
              {children}
            </motion.div>
          </div>

          <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              privacy
            </Link>
            <span className="mx-3 opacity-40">/</span>
            <Link href="/docs" className="transition-colors hover:text-foreground">
              docs
            </Link>
          </p>
        </main>
      </div>
    </GoogleAuthProvider>
  );
}
