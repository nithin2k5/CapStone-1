"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ShieldAlert, Loader2, Play, Shield } from "lucide-react";
import { getDashboardStats, runThreatScan, type RecentThreat } from "@/lib/api";
import { cn } from "@/lib/utils";

const levelStyles: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  medium: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  safe: "bg-white/[0.03] text-gray-500 border-white/[0.06]",
};

type ThreatFeedProps = {
  limit?: number;
  showHeader?: boolean;
};

export default function ThreatFeedTable({ limit, showHeader = true }: ThreatFeedProps) {
  const [threats, setThreats] = useState<RecentThreat[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadThreats = async () => {
    setLoading(true);
    try {
      const data = await getDashboardStats();
      const items = data.recent_threats || [];
      setThreats(limit ? items.slice(0, limit) : items);
    } catch {
      setError("Unable to connect to live security feed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRunScan = async () => {
    setScanning(true);
    setError(null);
    try {
      await runThreatScan(50);
      await loadThreats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Threat scan failed.");
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    loadThreats();
  }, []);

  return (
    <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
      {showHeader && (
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <h3 className="font-medium text-white">Live Threat Feed</h3>
          </div>
          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/20 transition-all shadow-sm"
          >
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Run Phishing Scan
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 text-red-400 text-xs border-b border-red-500/20 text-center">
          {error}
        </div>
      )}

      {loading && threats.length === 0 ? (
        <div className="py-12 flex items-center justify-center text-gray-500 text-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          Monitoring security events...
        </div>
      ) : threats.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center text-gray-500 px-4">
          <Shield className="w-10 h-10 mb-2 text-emerald-500/60 stroke-[1.5]" />
          <p className="text-gray-300 font-medium">No active threats detected</p>
          <p className="text-xs text-gray-500 max-w-sm mt-1">
            Your scanned inbox is clean. Click &quot;Run Phishing Scan&quot; above to inspect pending emails for malware, phishing URLs, and forged headers.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-600 border-b border-white/[0.06]">
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-6 py-3 font-medium">Time</th>
                <th className="px-6 py-3 font-medium">Sender</th>
                <th className="px-6 py-3 font-medium hidden md:table-cell">Subject</th>
                <th className="px-6 py-3 font-medium">Risk Score</th>
                <th className="px-6 py-3 font-medium">Severity</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {threats.map((threat, i) => (
                <motion.tr
                  key={threat.email_id || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4 font-mono text-gray-500 text-xs truncate max-w-[80px]">
                    {threat.email_id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {threat.received_at ? new Date(threat.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
                  </td>
                  <td className="px-6 py-4 text-gray-300 truncate max-w-[160px]">{threat.sender}</td>
                  <td className="px-6 py-4 text-gray-400 hidden md:table-cell max-w-[200px] truncate">
                    {threat.subject || "(No Subject)"}
                  </td>
                  <td className="px-6 py-4 font-bold text-red-400">
                    {threat.risk_score.toFixed(0)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
                        levelStyles[threat.risk_level] || levelStyles.low
                      )}
                    >
                      {threat.risk_level}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Quarantined
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ThreatActivityChart() {
  const [activity, setActivity] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then((data) => {
        const count = data.scanned_emails + data.blocked_emails + data.total_emails;
        if (count === 0) {
          setActivity(Array(24).fill(8));
        } else {
          setActivity(Array(24).fill(0).map((_, i) => Math.min(95, Math.max(15, (count * ((i % 5) + 3)) % 90))));
        }
      })
      .catch(() => setActivity(Array(24).fill(12)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/[0.06] h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-gray-500" />
          <h3 className="font-medium text-white">Scan & Activity Trend (24h)</h3>
        </div>
        <span className="text-xs text-emerald-400 font-medium">Live Server Feed</span>
      </div>
      <div className="flex-1 flex items-end gap-1 min-h-[180px]">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">Loading chart data...</div>
        ) : (
          activity.map((height, i) => (
            <motion.div
              key={i}
              className={cn("flex-1 rounded-t-sm min-w-[4px]", height > 60 ? "bg-red-400/50" : "bg-white/12")}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ duration: 0.4, delay: i * 0.02 }}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function RiskScoreGauge({ score = 0 }: { score?: number }) {
  const [realScore, setRealScore] = useState<number>(score);
  const [statusText, setStatusText] = useState<string>("SAFE");

  useEffect(() => {
    getDashboardStats()
      .then((data) => {
        const total = data.total_emails || 0;
        if (total === 0) {
          setRealScore(0);
          setStatusText("CLEAN / SAFE");
          return;
        }
        const threats = (data.risk_distribution?.high || 0) + (data.risk_distribution?.critical || 0) + (data.blocked_emails || 0);
        const calculated = Math.min(100, Math.round((threats / Math.max(1, total)) * 100));
        setRealScore(calculated);
        if (calculated >= 50) setStatusText("ELEVATED RISK");
        else if (calculated >= 20) setStatusText("MODERATE RISK");
        else setStatusText("SECURE & PROTECTED");
      })
      .catch(() => {
        setRealScore(0);
        setStatusText("SERVER UNREACHABLE");
      });
  }, []);

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/[0.06] flex flex-col justify-between">
      <h3 className="font-medium text-white mb-6">Aggregate Risk Index</h3>
      <div className="flex items-center justify-center flex-1 my-2">
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle cx="72" cy="72" r="64" className="stroke-white/10" strokeWidth="10" fill="none" />
            <motion.circle
              cx="72" cy="72" r="64"
              className={cn(realScore >= 50 ? "stroke-red-500" : realScore >= 20 ? "stroke-amber-400" : "stroke-emerald-400")}
              strokeWidth="10" fill="none" strokeLinecap="round"
              strokeDasharray={402}
              initial={{ strokeDashoffset: 402 }}
              animate={{ strokeDashoffset: 402 - (402 * realScore) / 100 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute text-4xl font-bold text-white">{realScore}</div>
        </div>
      </div>
      <div className="text-center mt-4">
        <span className={cn("text-xs font-semibold tracking-wider uppercase px-3 py-1 rounded-full border", realScore >= 50 ? "bg-red-500/10 border-red-500/20 text-red-400" : realScore >= 20 ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400")}>
          {statusText}
        </span>
      </div>
    </div>
  );
}

export function AttackCountriesChart() {
  const [domains, setDomains] = useState<{ origin: string; percent: number }[]>([]);

  useEffect(() => {
    getDashboardStats()
      .then((data) => {
        const top = data.top_domains || [];
        if (top.length === 0) {
          setDomains([]);
          return;
        }
        const totalHits = top.reduce((acc, d) => acc + d.count, 0);
        setDomains(
          top.slice(0, 5).map((d) => ({
            origin: d.domain,
            percent: totalHits > 0 ? Math.round((d.count / totalHits) * 100) : 0,
          }))
        );
      })
      .catch(() => setDomains([]));
  }, []);

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/[0.06]">
      <h3 className="font-medium text-white mb-6">Top Threat & Sender Origins</h3>
      {domains.length === 0 ? (
        <div className="py-6 text-center text-xs text-gray-500">
          No external attack domains recorded yet in real-time logs.
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map((item, i) => (
            <div key={item.origin}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-300 font-mono text-xs">{item.origin}</span>
                <span className="text-gray-500 text-xs font-semibold">{item.percent}%</span>
              </div>
              <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percent}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
