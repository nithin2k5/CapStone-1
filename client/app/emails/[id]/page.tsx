"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, ShieldAlert, CheckCircle2, ShieldX, Link as LinkIcon, FileText, Download } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getEmailById, EmailDetail } from "@/lib/api";

export default function EmailDetailPage() {
  const params = useParams();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEmail() {
      if (params.id) {
        try {
          const data = await getEmailById(params.id as string);
          setEmail(data);
        } catch (err) {
          console.error("Failed to load email details", err);
        } finally {
          setLoading(false);
        }
      }
    }
    loadEmail();
  }, [params.id]);

  if (loading) {
    return <div className="text-gray-400 p-8">Loading analysis...</div>;
  }

  if (!email) {
    return <div className="text-red-400 p-8">Email not found or could not be loaded.</div>;
  }

  const riskLevel = email.risk_score > 80 ? "CRITICAL" : email.risk_score > 50 ? "HIGH" : "SAFE";
  const receivedAt = email.received_at || email.created_at;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/emails" className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors w-max">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Emails
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-2xl font-heading font-bold text-white mb-2">{email.subject || "No Subject"}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-300">From:</span>
              <span>{email.sender}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-300">To:</span>
              <span>{email.recipient}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-300">Time:</span>
              <span>{receivedAt ? new Date(receivedAt).toLocaleString() : "Unknown"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="danger" icon={ShieldX}>
            Delete Permanently
          </Button>
          <Button variant="secondary" icon={CheckCircle2}>
            Mark as Safe
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1 space-y-6">
          
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase mb-4 flex items-center gap-2 border-b border-white/5 pb-4">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              Security Analysis
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Authentication</span>
                <Badge variant={riskLevel === "CRITICAL" ? "blocked" : "safe"}>
                  {riskLevel === "CRITICAL" ? "FAILED" : "PASSED"}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">SPF</div>
                  <div className="text-sm font-semibold text-red-400">FAIL</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">DKIM</div>
                  <div className="text-sm font-semibold text-red-400">FAIL</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">DMARC</div>
                  <div className="text-sm font-semibold text-amber-400">NONE</div>
                </div>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-white tracking-wide uppercase mt-8 mb-4 flex items-center gap-2 border-b border-white/5 pb-4">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              Threat Scan
            </h3>

            <div className="space-y-3">
              <div className={`flex items-center justify-between p-3 rounded-lg ${riskLevel === "CRITICAL" ? "bg-red-500/5 border border-red-500/10" : "bg-white/5"}`}>
                <span className="text-sm text-gray-300">Overall Risk</span>
                <Badge variant={riskLevel === "CRITICAL" ? "blocked" : riskLevel === "HIGH" ? "suspicious" : "safe"}>
                  {riskLevel} ({email.risk_score.toFixed(1)})
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-sm text-gray-300">Status</span>
                <Badge variant={email.status === "blocked" ? "blocked" : email.status === "quarantined" ? "suspicious" : "safe"}>
                  {email.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase mb-4 border-b border-white/5 pb-4">
              Detected Entities
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                  <LinkIcon className="w-3 h-3" /> Suspicious Links (1)
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-red-500/30 text-sm text-red-400 break-all">
                  https://microsoft-security-verify.com/login?token=abc123xyz
                </div>
              </div>
            </div>
          </GlassCard>

        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <GlassCard className="h-full min-h-[600px] flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
              </div>
              <div className="text-xs font-mono text-gray-500 bg-white/5 px-3 py-1 rounded-full">
                Content Preview (Sanitized)
              </div>
            </div>
            <div className="flex-1 p-8 overflow-y-auto bg-white/[0.01]">
              {/* Sanitized email content preview */}
              <div className="max-w-2xl mx-auto bg-white text-black p-8 rounded shadow-lg font-sans">
                {email.body_html ? (
                  <div dangerouslySetInnerHTML={{ __html: email.body_html }} />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm">{email.body_text || "No preview available for this email."}</pre>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
