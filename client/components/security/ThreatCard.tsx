import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { ShieldAlert, AlertTriangle, ShieldX, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThreatCardProps {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  type: string;
  source: string;
  time: string;
  actionTaken: "BLOCKED" | "QUARANTINED" | "MONITORED";
}

export function ThreatCard({ severity, type, source, time, actionTaken }: ThreatCardProps) {
  const isCritical = severity === "CRITICAL";
  const isHigh = severity === "HIGH";
  
  return (
    <GlassCard 
      hover 
      className={cn(
        "p-5 relative overflow-hidden group border",
        isCritical ? "border-red-500/30" : isHigh ? "border-amber-500/30" : "border-border"
      )}
    >
      <div 
        className={cn(
          "absolute top-0 left-0 w-1 h-full",
          isCritical ? "bg-red-500 shadow-[0_0_15px_rgba(248,113,113,0.6)]" : 
          isHigh ? "bg-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.6)]" : 
          "bg-purple-500"
        )} 
      />
      
      <div className="pl-3">
        <div className="flex items-start justify-between mb-4">
          <Badge 
            variant={isCritical ? "blocked" : isHigh ? "suspicious" : "info"}
            className="flex items-center gap-1.5"
          >
            {isCritical ? <ShieldX className="w-3 h-3" /> : isHigh ? <AlertTriangle className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
            {severity}
          </Badge>
          
          <div className="text-xs font-semibold tracking-wider text-muted-foreground">
            {actionTaken}
          </div>
        </div>
        
        <h3 className="text-lg font-heading font-semibold text-foreground mb-2">{type}</h3>
        
        <div className="space-y-1.5 mb-4">
          <div className="text-sm text-gray-300 truncate" title={source}>
            {source}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Detected {time}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
