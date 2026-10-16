import { GlassCard } from "@/components/ui/GlassCard";
import type { StabilityFindings } from "@/lib/api";

export function StabilityPanel({ result }: { result?: StabilityFindings }) {
  if (!result) return null;
  return (
    <GlassCard className="p-6 space-y-4">
      <h2 className="font-semibold">Verdict stability</h2>
      <p className="text-sm text-muted-foreground">
        {result.skipped_reason || (result.degraded
          ? "Experiment incomplete. These results do not establish stability."
          : result.review_required ? "Review required: the model’s decision was unreliable."
          : "No reproducible change found in the tested variants.")}
      </p>
      {result.control_scores.length > 0 && (
        <p className="text-sm">Control scores: {result.control_scores.join(", ")} / 100
          <span className="text-muted-foreground"> · Observed spread: {result.noise_range} points · {result.calls} model calls</span>
        </p>
      )}
      {result.inconclusive && <p className="text-sm text-amber-500">The unchanged input was too noisy to attribute a change to concealed text.</p>}
      {result.variants.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <caption className="sr-only">Repeated scores for concealed-content variants</caption>
            <thead><tr><th className="py-2">Variant</th><th>Repeated scores</th><th>Effect</th></tr></thead>
            <tbody>{result.variants.map((variant) => (
              <tr key={variant.name} className="border-t border-white/10">
                <td className="py-2">{variant.name.replaceAll("_", " ")}</td>
                <td>{variant.scores.join(", ")}</td>
                <td>{variant.reproducible ? variant.direction : "Not reproduced"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">A stability check measures model behavior; it does not prove malicious intent.</p>
    </GlassCard>
  );
}
