import { LucideIcon } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  trend: string;
  trendUp: boolean;
  icon: LucideIcon;
  description: string;
  color?: "purple" | "blue" | "emerald" | "amber" | "red";
}

export function MetricCard({
  title,
  value,
  trend,
  trendUp,
  icon: Icon,
  description,
  color = "purple",
}: MetricCardProps) {
  const colorStyles = {
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  return (
    <GlassCard hover className="p-6 relative overflow-hidden group">
      {/* Subtle background glow based on color */}
      <div 
        className={cn(
          "absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40",
          color === "purple" && "bg-purple-500",
          color === "blue" && "bg-blue-500",
          color === "emerald" && "bg-emerald-500",
          color === "amber" && "bg-amber-500",
          color === "red" && "bg-red-500"
        )} 
      />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-xl border", colorStyles[color])}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase">{title}</h3>
        </div>
      </div>

      <div className="relative z-10">
        <div className="text-3xl font-heading font-bold text-foreground mb-2">{value}</div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full border",
              trendUp
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                : color === "red" 
                  ? "text-red-400 bg-red-500/10 border-red-500/20" 
                  : "text-amber-400 bg-amber-500/10 border-amber-500/20"
            )}
          >
            {trendUp ? "↑" : "↓"} {trend}
          </span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </div>
    </GlassCard>
  );
}
