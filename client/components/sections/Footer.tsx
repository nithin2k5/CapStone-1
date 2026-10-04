"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { GithubIcon, TwitterIcon, LinkedinIcon } from "@/components/ui/SocialIcons";

const columns = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Architecture", href: "/#architecture" },
      { label: "Console", href: "/#dashboard" },
      { label: "How to use", href: "/#how-to-use" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Research", href: "/#research" },
      { label: "Threat model", href: "/docs" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/privacy" },
      { label: "Security policy", href: "/privacy" },
      { label: "Contact", href: "/#contact" },
    ],
  },
];

const socials = [
  { label: "GitHub", href: "https://github.com", Icon: GithubIcon },
  { label: "X", href: "#", Icon: TwitterIcon },
  { label: "LinkedIn", href: "#", Icon: LinkedinIcon },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-border bg-background">
      <div className="rule-fade absolute inset-x-0 top-0 h-px" />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[2fr_3fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="chip glow-accent h-9 w-9">
                <ShieldCheck className="h-[18px] w-[18px]" />
              </span>
              <span className="display text-[17px] tracking-tight text-foreground">
                Secure<span className="text-accent">.</span>Email
                <span className="text-muted-foreground">_GW</span>
              </span>
            </Link>

            <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
              Post-delivery phishing analysis that scores the gap between the
              message a recipient renders and the message a classifier reads.
            </p>

            <div className="mt-6 flex gap-2.5">
              {socials.map(({ label, href, Icon }) => (
                <Link
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noreferrer" : undefined}
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all duration-250 hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent"
                >
                  <Icon />
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.heading}>
                <h3 className="font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-foreground">
                  {column.heading}
                </h3>
                <ul className="mt-5 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[13.5px] text-muted-foreground transition-colors hover:text-accent"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="font-mono text-[12px] text-muted-foreground">
            © {new Date().getFullYear()} Secure Email Gateway · a research
            project
          </p>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-accent" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              all systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
