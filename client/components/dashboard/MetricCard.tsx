import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";

type Tone = "accent" | "success" | "warning" | "danger";

interface MetricCardProps {
  title: string;
  value: number | null;
  /** Share of all scanned mail, 0–1; drawn as a bar under the figure. */
  share?: number;
  icon: LucideIcon;
  description: string;
  tone?: Tone;
}

const toneVar: Record<Tone, string> = {
  accent: "var(--accent)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
};

export function MetricCard({
  title,
  value,
  share,
  icon: Icon,
  description,
  tone = "accent",
}: MetricCardProps) {
  const color = toneVar[tone];

  return (
    <GlassCard hover className="group overflow-hidden p-5">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-15 blur-3xl transition-opacity duration-300 group-hover:opacity-30"
        style={{ background: color }}
      />

      <div className="relative flex items-start justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </span>
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl border"
          style={{
            color,
            borderColor: `color-mix(in srgb, ${color} 30%, var(--border))`,
            background: `color-mix(in srgb, ${color} 10%, transparent)`,
          }}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>

      <div className="display relative mt-3 text-[2.1rem] leading-none text-foreground">
        {value === null ? (
          <span className="inline-block h-8 w-20 animate-pulse rounded-md bg-secondary align-middle" />
        ) : (
          value.toLocaleString()
        )}
      </div>

      <div className="relative mt-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color, boxShadow: `0 0 10px ${color}` }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.round((share ?? 0) * 100)}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground">{description}</span>
          {share !== undefined && (
            <span className="font-mono" style={{ color }}>
              {Math.round(share * 100)}%
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
