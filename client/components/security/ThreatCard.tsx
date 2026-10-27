import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ShieldAlert, AlertTriangle, ShieldX, Clock, ArrowUpRight } from "lucide-react";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface ThreatCardProps {
  id: string;
  severity: Severity;
  type: string;
  source: string;
  time: string;
  score: number;
}

export const severityColor: Record<Severity, string> = {
  CRITICAL: "var(--danger)",
  HIGH: "color-mix(in srgb, var(--danger) 65%, var(--warning))",
  MEDIUM: "var(--warning)",
  LOW: "var(--accent)",
};

/** One entry on the threat timeline: a node on the rail and a card beside it. */
export function ThreatCard({ id, severity, type, source, time, score }: ThreatCardProps) {
  const color = severityColor[severity];
  const Icon = severity === "CRITICAL" ? ShieldX : severity === "LOW" ? ShieldAlert : AlertTriangle;

  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <span
          className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
          style={{
            color,
            borderColor: `color-mix(in srgb, ${color} 40%, var(--border))`,
            background: `color-mix(in srgb, ${color} 12%, var(--card))`,
            boxShadow: `0 0 18px -4px ${color}`,
          }}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="w-px flex-1 bg-border" />
      </div>

      <Link
        href={`/emails/${id}`}
        className="panel-lift group mb-4 flex min-w-0 flex-1 items-center gap-4 p-4"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={severity === "LOW" ? "info" : severity === "MEDIUM" ? "suspicious" : "blocked"}>
              {severity}
            </Badge>
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {time}
            </span>
          </div>
          <h3 className="mt-2 truncate text-[14.5px] font-semibold text-foreground">{type}</h3>
          <div className="mt-0.5 truncate font-mono text-[11.5px] text-muted-foreground" title={source}>
            {source}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="display text-[1.5rem] leading-none" style={{ color }}>
            {Math.round(score)}
          </div>
          <div className="mt-1 flex items-center justify-end gap-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-accent">
            inspect <ArrowUpRight className="h-3 w-3" />
          </div>
        </div>
      </Link>
    </div>
  );
}
