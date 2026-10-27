import { GlassCard } from "@/components/ui/GlassCard";
import type { AccessibilityFindings } from "@/lib/api";

export function AccessibilityPanel({ result }: { result?: AccessibilityFindings }) {
  if (!result) return null;
  return (
    <GlassCard className="p-6 space-y-4">
      <h2 className="font-semibold">Accessibility comparison</h2>
      <p className="text-sm text-muted-foreground">{!result.ran ? result.skipped_reason : result.review_required
        ? "Review required: the message presents conflicting security information."
        : "No security-relevant conflict found in the supported HTML features."}</p>
      {result.ran && <div className="grid gap-4 lg:grid-cols-3">
        {[["Visible text (estimated)", result.visible_excerpt], ["Screen-reader text (estimated)", result.accessible_excerpt], ["Classifier ingestion", result.machine_excerpt]].map(([label, text]) => (
          <div key={label} className="min-w-0"><h3 className="text-sm font-medium mb-2">{label}</h3>
            <pre className="text-xs whitespace-pre-wrap break-words rounded-lg bg-secondary/60 p-3 max-h-60 overflow-auto">{text || "No text"}</pre>
          </div>
        ))}
      </div>}
      {result.mismatches.map((mismatch, i) => <div key={i} className="border-l-2 border-amber-500 pl-3 text-sm space-y-1">
        <p>{mismatch.reason}</p><p className="break-words text-muted-foreground">Visible/target: {mismatch.visible || "No text"}</p>
        <p className="break-words text-muted-foreground">Accessible: {mismatch.accessible}</p>
      </div>)}
      {result.evidence_truncated && <p className="text-xs text-muted-foreground">Evidence excerpts are truncated.</p>}
      <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Coverage: {result.method}</summary>
        {result.limitations.map((limitation) => <p className="mt-2" key={limitation}>{limitation}</p>)}
      </details>
    </GlassCard>
  );
}
