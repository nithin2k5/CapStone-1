"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Eye, EyeOff, ArrowRight, TrendingDown, Info } from "lucide-react";
import { PerceptualFindings, ProbeFindings } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DivergencePanelProps {
  perceptual?: PerceptualFindings;
  probe?: ProbeFindings;
}

/**
 * The two documents an email actually is: what the recipient rendered, and what
 * the classifier ingested.
 *
 * Every other panel reports a number. This one shows the text those numbers are
 * a claim about, so a reviewer can disagree with the verdict on the evidence
 * rather than on trust.
 *
 * Concealed text is attacker-controlled. It is rendered as text — never as
 * markup, never through dangerouslySetInnerHTML — and the instruction-shaped
 * spans are labelled as payloads so nobody reading this screen mistakes them for
 * the system talking.
 */
export function DivergencePanel({ perceptual, probe }: DivergencePanelProps) {
  const evidence = perceptual?.evidence;
  const segments = evidence?.concealed_segments ?? [];
  const hasDivergence = segments.length > 0;

  if (!perceptual) return null;

  return (
    <GlassCard className="overflow-hidden">
      <div className="p-6 border-b border-border">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-heading font-bold text-foreground tracking-wide">
              Rendered vs analysed
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              The message the recipient sees, beside the text handed to the
              classifier. Benign mail diverges a little — a preheader, a footer.
              A wide gap whose hidden half gives instructions does not.
            </p>
          </div>
          <Badge variant={hasDivergence ? "suspicious" : "safe"}>
            {(perceptual.hidden_ratio * 100).toFixed(0)}% of body concealed
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
        <section className="p-6">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            <Eye className="w-3.5 h-3.5" />
            What the recipient saw
          </div>
          <p className="text-sm text-gray-300 whitespace-pre-wrap break-words leading-relaxed font-mono">
            {evidence?.visible_excerpt?.trim() || "No rendered text."}
          </p>
        </section>

        <section className="p-6">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            <EyeOff className="w-3.5 h-3.5" />
            What the recipient never saw
          </div>

          {!hasDivergence && (
            <p className="text-sm text-muted-foreground">
              Nothing was concealed. The rendered message and the analysed text
              agree.
            </p>
          )}

          <div className="space-y-3">
            {segments.map((segment, i) => (
              <div
                key={i}
                className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-3"
              >
                <p className="text-sm text-amber-100/90 whitespace-pre-wrap break-words leading-relaxed font-mono">
                  {segment.text}
                  {segment.truncated && (
                    <span className="text-muted-foreground"> …</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {segment.channels.map((channel) => (
                    <span
                      key={channel}
                      className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-semibold tracking-wider uppercase text-amber-300"
                    >
                      {channel.replace(/-/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {evidence?.truncated && (
            <p className="text-xs text-muted-foreground mt-3">
              Evidence clipped for storage — the full text stayed in the scan.
            </p>
          )}
        </section>
      </div>

      {perceptual.imperative_hidden && (
        <div className="px-6 py-4 border-t border-border bg-red-500/[0.04]">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-300 font-semibold">
                The concealed text addresses the analyser, not the reader
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Matched: {perceptual.instruction_patterns.join(", ")}. Text a
                sender hides from the recipient while aiming it at the classifier
                has no benign explanation, so this alone reaches quarantine.
              </p>
            </div>
          </div>
        </div>
      )}

      <ProbeMeasurement probe={probe} />
    </GlassCard>
  );
}

/**
 * The probe scored the body twice and this is the gap. Shown as two verdicts and
 * the distance between them, because the distance is the measurement — not a
 * detector's opinion about the wording.
 */
function ProbeMeasurement({ probe }: { probe?: ProbeFindings }) {
  if (!probe) return null;

  if (!probe.ran) {
    return (
      <div className="px-6 py-3 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Differential probe:{" "}
          {probe.degraded
            ? "the second analysis failed, so the concealed half was not measured."
            : probe.skipped_reason || "not run."}
        </p>
      </div>
    );
  }

  const moved = probe.suppression > 0 ? probe.suppression : probe.escalation;
  const towardSafe = probe.suppression > 0;

  return (
    <div
      className={cn(
        "px-6 py-5 border-t border-border",
        towardSafe && probe.suppression >= 15 && "bg-red-500/[0.04]"
      )}
    >
      <div className="flex items-center gap-2 mb-4 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
        <TrendingDown className="w-3.5 h-3.5" />
        What the concealed half did to the verdict
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Verdict label="Scored on the visible text" value={probe.visible_score} />
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
        <Verdict
          label="Scored on the text as ingested"
          value={probe.ingested_score}
          tone={towardSafe && moved >= 15 ? "danger" : "neutral"}
        />

        {moved > 0 && (
          <div className="ml-auto text-right">
            <div
              className={cn(
                "text-2xl font-heading font-bold",
                towardSafe ? "text-red-400" : "text-amber-400"
              )}
            >
              {towardSafe ? "−" : "+"}
              {moved.toFixed(0)}
            </div>
            <div className="text-[10px] tracking-wider uppercase text-muted-foreground">
              {towardSafe ? "pulled toward safe" : "concealed content"}
            </div>
          </div>
        )}
      </div>

      {probe.findings.map((finding, i) => (
        <p key={i} className="text-xs text-muted-foreground mt-3">
          {finding}
        </p>
      ))}
    </div>
  );
}

function Verdict({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "danger";
}) {
  return (
    <div>
      <div
        className={cn(
          "text-xl font-heading font-bold",
          tone === "danger" ? "text-red-400" : "text-foreground"
        )}
      >
        {value.toFixed(0)}
        <span className="text-xs text-muted-foreground font-sans"> / 100</span>
      </div>
      <div className="text-[10px] tracking-wider uppercase text-muted-foreground mt-0.5">
        {label}
      </div>
    </div>
  );
}
