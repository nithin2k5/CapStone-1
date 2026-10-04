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
      { label: "How it works", href: "/#how-to-use" },
      { label: "Console", href: "/dashboard" },
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
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[2fr_3fr]">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-contrast">
                <ShieldCheck className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-foreground">
                Secure Email Gateway
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Post-delivery phishing analysis that scores the gap between the
              message a recipient renders and the message a classifier reads.
            </p>

            <div className="mt-6 flex gap-2">
              {socials.map(({ label, href, Icon }) => (
                <Link
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noreferrer" : undefined}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
                >
                  <Icon />
                </Link>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.heading}>
                <h3 className="text-[13px] font-semibold text-foreground">
                  {column.heading}
                </h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
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
          <p className="text-[13px] text-muted-foreground">
            © {new Date().getFullYear()} Secure Email Gateway. A research
            project.
          </p>
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
