"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { History, Network } from "lucide-react";
import { CampaignFindings } from "@/lib/api";

/**
 * Every other panel judges this message alone. This one asks whether its
 * concealed half has arrived here before.
 *
 * It works because of what an attacker has to change to reset the rest of the
 * pipeline: rotating the sending domain clears the header analyser, the URL
 * reputation and the sender history at once, and changes nothing about the text
 * in the hidden half — because that text is the attack. Repetition across
 * domains is therefore the signal, and the fingerprint survives the mutations
 * that defeat pattern matching, since it is taken after normalisation.
 *
 * Only fragments from messages that were quarantined count. Bulk mail repeats
 * footers and preheaders across senders constantly.
 */
export function CampaignHistory({ campaign }: { campaign?: CampaignFindings }) {
  if (!campaign) return null;

  if (!campaign.ran) {
    return (
      <GlassCard className="p-6">
        <Header />
        <p className="text-xs text-muted-foreground mt-3">
          {campaign.skipped_reason ||
            "Not run — nothing concealed here was long enough to identify."}
        </p>
      </GlassCard>
    );
  }

  if (campaign.matches === 0) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-start justify-between gap-3">
          <Header />
          <Badge variant="neutral">First sighting</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          None of this message&apos;s{" "}
          {campaign.fingerprints.length === 1
            ? "concealed fragment matches"
            : `${campaign.fingerprints.length} concealed fragments match`}{" "}
          anything quarantined before. Recorded, so the next message carrying it
          is not a first sighting either.
        </p>
      </GlassCard>
    );
  }

  const firstSeen = campaign.first_seen ? new Date(campaign.first_seen) : null;

  return (
    <GlassCard className="p-6 border-red-500/30">
      <div className="flex items-start justify-between gap-3">
        <Header />
        <Badge variant="blocked">Seen before</Badge>
      </div>

      <div className="flex flex-wrap gap-6 mt-4">
        <Figure value={campaign.matches} label="prior quarantined sightings" />
        <Figure
          value={campaign.distinct_domains}
          label={
            campaign.distinct_domains === 1
              ? "other sending domain"
              : "other sending domains"
          }
          tone={campaign.crosses_domains ? "danger" : "neutral"}
        />
        {firstSeen && (
          <div>
            <div className="text-xl font-heading font-bold text-foreground">
              {firstSeen.toLocaleDateString()}
            </div>
            <div className="text-[10px] tracking-wider uppercase text-muted-foreground mt-0.5">
              first seen
            </div>
          </div>
        )}
      </div>

      {campaign.crosses_domains && (
        <div className="flex items-start gap-2.5 mt-4 p-3 rounded-xl bg-red-500/[0.04] border border-red-500/20">
          <Network className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-red-300 font-semibold">
              The same hidden text, sent from different domains.
            </span>{" "}
            Rotating the sender resets every reputation signal the gateway holds.
            It does not rewrite the payload, which is why the payload is what gets
            identified.
          </p>
        </div>
      )}

      {campaign.sample && (
        /* The fragment as it arrived: attacker-controlled, rendered as text. */
        <div className="mt-4">
          <div className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1.5">
            The fragment that matched
          </div>
          <p className="text-xs text-amber-100/90 font-mono whitespace-pre-wrap break-words leading-relaxed rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-3">
            {campaign.sample}
          </p>
        </div>
      )}
    </GlassCard>
  );
}

function Figure({
  value,
  label,
  tone = "neutral",
}: {
  value: number;
  label: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <div>
      <div
        className={
          tone === "danger"
            ? "text-xl font-heading font-bold text-red-400"
            : "text-xl font-heading font-bold text-foreground"
        }
      >
        {value}
      </div>
      <div className="text-[10px] tracking-wider uppercase text-muted-foreground mt-0.5">
        {label}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h3 className="text-base font-heading font-bold text-foreground tracking-wide">
        <History className="w-4 h-4 inline-block mr-2 -mt-0.5 text-muted-foreground" />
        Has this payload been here before?
      </h3>
      <p className="text-xs text-muted-foreground mt-1">
        The hidden half, matched against what this account has quarantined.
      </p>
    </div>
  );
}
