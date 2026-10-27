"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import GoogleAuthProvider from "@/components/auth/GoogleAuthProvider";
import { AuthShowcase } from "@/components/auth/AuthShowcase";

/**
 * Shell for every signed-out page. The pitch and a sample scan sit beside the
 * form in one centred container, so the two stay together on wide screens
 * instead of drifting to opposite edges. Below `lg` the pitch drops away and
 * the form takes the full width.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <GoogleAuthProvider>
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="hex-bg absolute inset-0"
            style={{
              maskImage: "radial-gradient(70% 60% at 30% 45%, #000 20%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(70% 60% at 30% 45%, #000 20%, transparent 80%)",
            }}
          />
          <div
            className="absolute left-[8%] top-1/4 h-[460px] w-[460px] rounded-full opacity-[0.14] blur-[140px] dark:opacity-[0.3]"
            style={{ background: "var(--accent-solid)" }}
          />
          <div
            className="absolute bottom-0 right-[10%] h-[380px] w-[380px] rounded-full opacity-[0.08] blur-[140px] dark:opacity-[0.18]"
            style={{ background: "var(--accent-2)" }}
          />
        </div>

        <header className="relative z-10 mx-auto flex w-full max-w-[1160px] items-center justify-between px-5 py-6 sm:px-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="chip h-9 w-9 rounded-xl transition-transform group-hover:scale-105">
              <ShieldCheck className="h-[18px] w-[18px]" />
            </span>
            <span className="font-display text-[15px] font-bold tracking-tight text-foreground">
              Secure Email Gateway
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Link>
        </header>

        <main className="relative z-10 mx-auto grid w-full max-w-[1160px] flex-1 items-center gap-14 px-5 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_440px] xl:gap-20">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:block"
          >
            <span className="eyebrow">
              <span className="h-px w-6 bg-accent" />
              dual-channel analysis
            </span>
            <h2 className="display mt-4 max-w-lg text-[2.5rem] text-foreground xl:text-[2.9rem]">
              What you read, and what the <span className="text-gradient">machine reads</span>.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Every message is scored twice: once as the recipient sees it, once as an AI
              assistant would ingest it. Text hidden between the two is where injections
              live.
            </p>

            <div className="mt-9">
              <AuthShowcase />
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
              <span>24 concealment channels</span>
              <span>SPF · DKIM · DMARC</span>
              <span>Gmail &amp; Outlook</span>
            </div>
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mx-auto w-full max-w-[440px] sm:rounded-3xl sm:border sm:border-border sm:bg-card/80 sm:p-9 sm:shadow-[var(--glow-2)] sm:backdrop-blur-xl"
          >
            {children}
          </motion.div>
        </main>

        <footer className="relative z-10 pb-6 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            privacy
          </Link>
          <span className="mx-3 opacity-40">/</span>
          <Link href="/docs" className="transition-colors hover:text-foreground">
            docs
          </Link>
        </footer>
      </div>
    </GoogleAuthProvider>
  );
}
