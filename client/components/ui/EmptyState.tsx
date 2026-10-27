import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border-strong bg-card/40 px-4 py-16 text-center">
      <div className="hex-bg pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border))" }}
        />
        <span
          className="animate-radar absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0 75%, color-mix(in srgb, var(--accent) 35%, transparent))",
          }}
        />
        <Icon className="relative h-7 w-7 text-accent" />
      </div>
      <h3 className="display relative mb-2 text-[17px] text-foreground">{title}</h3>
      <p className="relative mb-6 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="relative">{action}</div>}
    </div>
  );
}
