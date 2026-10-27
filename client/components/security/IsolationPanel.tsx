import { GlassCard } from "@/components/ui/GlassCard";
import type { IsolationFindings } from "@/lib/api";

export function IsolationPanel({ result }: { result?: IsolationFindings }) {
  if (!result || (!result.ran && !result.degraded)) return null;
  return (
    <GlassCard className="p-6 space-y-4">
      <h2 className="font-semibold">Concealed fragment isolation</h2>
      <p className="text-sm text-muted-foreground">
        {result.degraded ? result.skipped_reason : result.reproduced
          ? `A ${result.fragment.length}-character fragment reproduced ${result.direction}, reduced from ${result.original_chars} concealed characters.`
          : "The candidate did not reproduce its effect during final confirmation."}
      </p>
      {result.fragment && <pre className="whitespace-pre-wrap break-words rounded-lg bg-secondary/60 p-4 text-sm">{result.fragment}</pre>}
      {result.ran && <p className="text-sm">Fresh controls: {result.control_scores.join(", ")} · Fragment scores: {result.fragment_scores.join(", ")} / 100</p>}
      <p className="text-xs text-muted-foreground">{result.calls} model calls. {result.budget_exhausted ? "Search budget reached. " : ""}This is a candidate subset, not a guarantee of the smallest possible payload.</p>
      {result.source_sha256 && <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Source evidence</summary>
        <p className="break-all mt-2">Concealed-text SHA-256: {result.source_sha256}</p>
        <p>Character ranges (end excluded): {result.source_ranges.map(([start, end]) => `${start}–${end}`).join(", ")}</p>
      </details>}
    </GlassCard>
  );
}
