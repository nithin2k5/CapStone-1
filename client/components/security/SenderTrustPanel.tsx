import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import type { ScanFindings } from "@/lib/api";

export function SenderTrustPanel({ findings }: { findings?: ScanFindings | null }) {
  const trust = findings?.sender_trust;
  if (!trust) return null;
  const reassessment = findings?.trust_reassessment;
  const invalidation = findings?.trust_invalidation;
  return (
    <GlassCard className="p-6 space-y-4">
      <h2 className="font-semibold">Sender evidence</h2>
      <p className="text-sm text-muted-foreground">{!trust.recorded ? trust.skipped_reason : trust.supporting_email_ids.length
        ? `This sender assessment used ${trust.supporting_email_ids.length} earlier message(s).`
        : "No earlier message supplied positive sender evidence for this assessment."}</p>
      {trust.history_truncated && <p className="text-sm text-amber-500">History was limited to the latest 2,000 eligible earlier messages.</p>}
      {trust.supporting_email_ids.length > 0 && <details className="text-sm">
        <summary className="cursor-pointer">Inspect supporting messages</summary>
        <ul className="mt-2 space-y-1 max-h-48 overflow-auto">
          {trust.supporting_email_ids.map((id) => <li key={id}><Link className="text-cyan-500 underline break-all" href={`/emails/${id}`}>{id}</Link></li>)}
        </ul>
      </details>}
      {reassessment && <p className="text-sm">Re-evaluated after <Link className="text-cyan-500 underline" href={`/emails/${reassessment.triggering_email_id}`}>supporting evidence was condemned</Link>.
        {" "}Score changed from {reassessment.previous_score} to {reassessment.new_score}.
        {" "}Mailbox action {reassessment.enforced ? "confirmed" : "not confirmed"}.
      </p>}
      {invalidation && <p className="text-sm text-muted-foreground">{invalidation.error || `${invalidation.rescanned ?? 0} dependent messages re-evaluated; ${invalidation.pulled ?? 0} removed, ${invalidation.unenforced ?? 0} mailbox actions unconfirmed, ${invalidation.failed ?? 0} rescans failed.`}
        {invalidation.truncated && " Re-evaluation budget reached; additional dependencies need review."}
      </p>}
    </GlassCard>
  );
}
