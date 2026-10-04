"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { GithubIcon } from "@/components/ui/SocialIcons";
import { ThemeToggle } from "@/components/ThemeToggle";

const navLinks = [
  { name: "Features", href: "/#features" },
  { name: "Architecture", href: "/#architecture" },
  { name: "Console", href: "/#dashboard" },
  { name: "Research", href: "/#research" },
  { name: "Docs", href: "/docs" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-[68px] w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Wordmark */}
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <span className="chip glow-accent h-9 w-9">
            <ShieldCheck className="h-[18px] w-[18px]" />
          </span>
          <span className="display text-[17px] tracking-tight text-foreground">
            Secure<span className="text-accent">.</span>Email
            <span className="text-muted-foreground">_GW</span>
          </span>
        </Link>

        {/* Links */}
        <div className="hidden items-center gap-0.5 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <Link
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Source on GitHub"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <GithubIcon />
          </Link>
          <span className="mx-1 h-6 w-px bg-border" />
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-[13px] font-semibold text-foreground transition-colors hover:text-accent-2"
          >
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary px-4 py-2 text-[13px]">
            Get started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-foreground"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-b border-border bg-background lg:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg border-l-2 border-transparent px-3 py-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:border-accent hover:bg-secondary hover:text-foreground"
                >
                  {link.name}
                </Link>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-4">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="btn-secondary w-full py-2.5 text-sm"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="btn-primary w-full py-2.5 text-sm"
                >
                  Get started
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
