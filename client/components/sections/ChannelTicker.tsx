"use client";

import { EyeOff } from "lucide-react";

/** Every concealment channel label email_parser can emit. */
export const CHANNELS = [
  "display-none",
  "visibility-hidden",
  "opacity-zero",
  "near-transparent",
  "zero-font-size",
  "tiny-font-size",
  "clipped",
  "zero-scale",
  "zero-height",
  "zero-width",
  "offscreen-indent",
  "offscreen-position",
  "mso-hide",
  "matched-color",
  "near-matched-color",
  "transparent-color",
  "near-white-on-default",
  "white-on-default",
  "hidden-attribute",
  "stylesheet-class",
  "stylesheet-id",
  "template-element",
  "collapsed-details",
  "html-comment",
];

export default function ChannelTicker() {
  return (
    <section
      aria-label="Concealment channels detected"
      className="relative border-y border-border bg-secondary/50 py-4"
    >
      <div className="group relative flex overflow-hidden">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 sm:w-48"
          style={{
            background: "linear-gradient(to right, var(--secondary), transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 sm:w-48"
          style={{
            background: "linear-gradient(to left, var(--secondary), transparent)",
          }}
        />
        <div className="animate-marquee flex shrink-0 items-center gap-8 pr-8 group-hover:[animation-play-state:paused]">
          {[...CHANNELS, ...CHANNELS].map((c, i) => (
            <span
              key={i}
              aria-hidden={i >= CHANNELS.length}
              className="inline-flex items-center gap-2 whitespace-nowrap font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              <EyeOff className="h-3.5 w-3.5 text-accent" />
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
