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
        "bg-neutral-950/85 backdrop-blur-2xl border border-indigo-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.8)] rounded-2xl",
        hover && "transition-all duration-300 hover:shadow-[0_12px_40px_rgba(139,92,246,0.15)] hover:border-indigo-500/40",
        className
      )}
    >
      {children}
    </div>
  );
}
