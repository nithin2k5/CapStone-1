import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "safe" | "suspicious" | "blocked" | "info" | "neutral";
  className?: string;
}

// Verdict colours come from the semantic tokens so they hold in both themes.
const variants = {
  safe: "border-[color-mix(in_srgb,var(--success)_30%,var(--border))] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]",
  suspicious: "border-[color-mix(in_srgb,var(--warning)_30%,var(--border))] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning)]",
  blocked: "border-[color-mix(in_srgb,var(--danger)_30%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]",
  info: "border-[color-mix(in_srgb,var(--accent)_30%,var(--border))] bg-accent-subtle text-accent",
  neutral: "border-border bg-secondary text-muted-foreground",
};

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
