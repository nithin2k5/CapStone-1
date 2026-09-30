"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Users, MonitorSmartphone, Crosshair } from "lucide-react";
import { AudienceFindings } from "@/lib/api";

const AUDIENCES = {
  reader: {
    icon: Users,
    title: "Written for a person",
    body:
      "Concealed, but addressed to whoever opens the message — marketing copy, a legal footer, alt text. Hidden by layout or accident, not to reach the classifier.",
    variant: "safe" as const,
  },
  client: {
    icon: MonitorSmartphone,
    title: "Written for the mail client",
    body:
      "Preheader lines, conditional markup, tracking metadata. Ordinary bulk mail is full of this, and flagging it would flag most newsletters.",
    variant: "neutral" as const,
  },
  analyser: {
    icon: Crosshair,
    title: "Written for the system judging this message",
    body:
      "Text the sender concealed from the recipient while aiming it at the evaluator — instructing it, assigning it a role, or asserting that the message has already been cleared. No benign reason to conceal that.",
    variant: "blocked" as const,
  },
};

/**
 * The question the probe cannot answer.
 *
 * A payload inside an already-clean message moves no verdict, so there is no
 * gap to measure; phrased as an administrative note, it matches no pattern
 * either. So this asks a different question — who is the hidden text for? —
 * whose answer does not depend on the attacker having picked a phrasing someone
 * anticipated.
 *
 * The classified text is attacker-controlled. A verdict of "analyser" counts as
 * evidence; every other verdict is the absence of evidence, never a clearance,
 * so a payload that argues its way to "reader" gains nothing.
 */
export function AudienceVerdict({ audience }: { audience?: AudienceFindings }) {
  if (!audience) return null;

  if (!audience.ran) {
    return (
      <GlassCard className="p-6">
        <Header />
        <p className="text-xs text-muted-foreground mt-3">
          {audience.degraded
            ? "The model did not answer, so the audience of the concealed text is unknown. Treat that as unmeasured, not as clean."
            : audience.skipped_reason || "Not run — nothing was concealed to ask about."}
        </p>
      </GlassCard>
    );
  }

  const verdict = AUDIENCES[audience.label as keyof typeof AUDIENCES];
  if (!verdict) return null;

  const Icon = verdict.icon;
  const aimedAtUs = audience.label === "analyser";

  return (
    <GlassCard className={aimedAtUs ? "p-6 border-red-500/30" : "p-6"}>
      <div className="flex items-start justify-between gap-3">
        <Header />
        <Badge variant={verdict.variant}>
          {(audience.confidence * 100).toFixed(0)}% confidence
        </Badge>
      </div>

      <div className="flex items-start gap-3 mt-4">
        <div
          className={
            aimedAtUs
              ? "w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0"
              : "w-9 h-9 rounded-xl bg-foreground/[0.04] border border-border flex items-center justify-center shrink-0"
          }
        >
          <Icon
            className={
              aimedAtUs ? "w-4 h-4 text-red-400" : "w-4 h-4 text-muted-foreground"
            }
          />
        </div>
        <div>
          <p
            className={
              aimedAtUs
                ? "text-sm font-semibold text-red-300"
                : "text-sm font-semibold text-foreground"
            }
          >
            {verdict.title}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {verdict.body}
          </p>
        </div>
      </div>

      {audience.reason && (
        /* The model's own words about attacker-controlled text. Rendered as
           text, and labelled as a quotation, so nobody reads it as the system
           speaking. */
        <blockquote className="mt-4 pl-3 border-l-2 border-border">
          <p className="text-xs text-gray-300 leading-relaxed break-words">
            {audience.reason}
          </p>
          <footer className="text-[10px] tracking-wider uppercase text-muted-foreground mt-1.5">
            The classifier&apos;s reasoning
          </footer>
        </blockquote>
      )}
    </GlassCard>
  );
}

function Header() {
  return (
    <div>
      <h3 className="text-base font-heading font-bold text-foreground tracking-wide">
        Who the hidden text was for
      </h3>
      <p className="text-xs text-muted-foreground mt-1">
        A reader, the mail client, or whatever is judging the message.
      </p>
    </div>
  );
}
