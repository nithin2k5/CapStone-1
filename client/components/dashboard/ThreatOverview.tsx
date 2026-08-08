"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { cn } from "@/lib/utils";

const data = [
  { time: "00:00", clean: 120, threats: 4 },
  { time: "04:00", clean: 85, threats: 2 },
  { time: "08:00", clean: 340, threats: 15 },
  { time: "12:00", clean: 520, threats: 42 },
  { time: "16:00", clean: 480, threats: 28 },
  { time: "20:00", clean: 210, threats: 8 },
  { time: "24:00", clean: 95, threats: 3 },
];

export function ThreatOverview() {
  const [range, setRange] = useState<"24H" | "7D" | "30D">("24H");

  return (
    <GlassCard className="p-6 col-span-1 lg:col-span-2 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
      
      <div className="flex justify-between items-center mb-6 relative z-10">
        <div>
          <h3 className="text-sm font-medium text-gray-400 tracking-wide uppercase mb-1">
            Threat Activity
          </h3>
          <p className="text-xs text-gray-500">Volume of scanned and blocked emails over time.</p>
        </div>

        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
          {(["24H", "7D", "30D"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                range === r 
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" 
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[250px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorClean" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="rgba(255,255,255,0.2)" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.2)" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(10,10,10,0.9)', 
                borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)'
              }}
              itemStyle={{ fontSize: '13px' }}
              labelStyle={{ color: '#9ca3af', marginBottom: '4px', fontSize: '12px' }}
            />
            <Area 
              type="monotone" 
              dataKey="clean" 
              name="Safe Emails"
              stroke="#34d399" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorClean)" 
            />
            <Area 
              type="monotone" 
              dataKey="threats" 
              name="Threats Blocked"
              stroke="#f87171" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorThreats)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
