import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-[var(--glow-1)]",
        hover &&
          "transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:shadow-[var(--glow-2),var(--glow-accent)]",
        className
      )}
    >
      {children}
    </div>
  );
}
