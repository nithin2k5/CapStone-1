"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowRight, ArrowUpRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { GithubIcon } from "@/components/ui/SocialIcons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const REPO_URL = "https://github.com/nithin2k5/CapStone-1";

const navLinks = [
  { name: "Detection", href: "/#features", id: "features" },
  { name: "How it works", href: "/#how-to-use", id: "how-to-use" },
  { name: "Architecture", href: "/#architecture", id: "architecture" },
  { name: "Console", href: "/#dashboard", id: "dashboard" },
  { name: "Research", href: "/#research", id: "research" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

// Tracks which section sits under the nav so its link can be marked current.
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
        else if (window.scrollY < 200) setActive(null);
      },
      { rootMargin: "-80px 0px -55% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

const sectionIds = navLinks.map((l) => l.id);

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const active = useActiveSection(sectionIds);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock page scroll and allow Escape while the mobile sheet is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const highlighted = hovered ?? active;

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <nav
        aria-label="Primary"
        className={cn(
          "relative mx-auto flex h-[60px] w-full items-center justify-between gap-4 rounded-2xl border px-2.5 transition-[max-width,background-color,border-color,box-shadow] duration-500 sm:px-3",
          scrolled
            ? "max-w-6xl border-border bg-background/70 shadow-[var(--glow-2)] backdrop-blur-xl"
            : "max-w-7xl border-transparent bg-transparent"
        )}
      >
        {/* Wordmark */}
        <Link
          href="/"
          aria-label="Secure Email Gateway home"
          className="group flex shrink-0 items-center gap-2.5 rounded-xl py-1 pl-1 pr-2"
        >
          <span className="chip glow-accent relative h-9 w-9 overflow-hidden">
            <ShieldCheck className="relative z-10 h-[18px] w-[18px]" />
            <span
              className="animate-radar absolute inset-0 opacity-60"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0 75%, color-mix(in srgb, var(--accent) 45%, transparent))",
              }}
            />
          </span>
          <span className="display text-[16px] tracking-tight text-foreground">
            Secure<span className="text-accent">.</span>Email
            <span className="text-muted-foreground">_GW</span>
          </span>
        </Link>

        {/* Links — a single pill slides between hover and the current section */}
        <ul
          onMouseLeave={() => setHovered(null)}
          className="absolute left-1/2 hidden -translate-x-1/2 items-center xl:flex"
        >
          {navLinks.map((link) => {
            const isActive = active === link.id;
            return (
              <li key={link.id}>
                <Link
                  href={link.href}
                  onMouseEnter={() => setHovered(link.id)}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "relative block rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
                    highlighted === link.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {highlighted === link.id && (
                    <motion.span
                      layoutId="nav-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 -z-10 rounded-lg bg-secondary"
                    />
                  )}
                  {link.name}
                  {isActive && (
                    <motion.span
                      layoutId="nav-dot"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute bottom-1 left-1/2 h-[3px] w-3 -translate-x-1/2 rounded-full bg-accent"
                      style={{ boxShadow: "0 0 8px var(--accent)" }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Actions */}
        <div className="hidden items-center gap-1 xl:flex">
          <Link
            href="/docs"
            className="rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
          </Link>
          <Link
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Source on GitHub"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <GithubIcon />
          </Link>
          <ThemeToggle />
          <span className="mx-1.5 h-5 w-px bg-border" />
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-[13px] font-semibold text-foreground transition-colors hover:text-accent"
          >
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary group px-4 py-2 text-[13px]">
            Get started
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-1 xl:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-border bg-card/60 p-2 text-foreground"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 -z-10 bg-background/60 backdrop-blur-sm xl:hidden"
            />
            <motion.div
              id="mobile-nav"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="mx-auto mt-2 max-w-7xl origin-top overflow-hidden rounded-2xl border border-border bg-background/95 shadow-[var(--glow-3)] backdrop-blur-xl xl:hidden"
            >
              <ul className="flex flex-col p-2">
                {[...navLinks, { name: "Docs", href: "/docs", id: "docs" }].map(
                  (link, i) => (
                    <motion.li
                      key={link.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.03 * i, duration: 0.2, ease: EASE }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-3.5 py-3 text-[15px] font-medium transition-colors",
                          active === link.id
                            ? "bg-accent-subtle text-accent"
                            : "text-foreground hover:bg-secondary"
                        )}
                      >
                        {link.name}
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </motion.li>
                  )
                )}
              </ul>
              <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
