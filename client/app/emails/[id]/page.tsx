"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, ShieldAlert, CheckCircle2, ShieldX, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getEmailById, EmailDetail, getScanResult, ScanResult } from "@/lib/api";
import { DivergencePanel } from "@/components/security/DivergencePanel";
import { StabilityPanel } from "@/components/security/StabilityPanel";
import { IsolationPanel } from "@/components/security/IsolationPanel";
import { AccessibilityPanel } from "@/components/security/AccessibilityPanel";
import { SenderTrustPanel } from "@/components/security/SenderTrustPanel";
import { AudienceVerdict } from "@/components/security/AudienceVerdict";
import { CampaignHistory } from "@/components/security/CampaignHistory";
import { SafeMessagePreview } from "@/components/security/SafeMessagePreview";

/**
 * Every value recorded under a header name, joined.
 *
 * Two things the stored headers do that a plain lookup does not survive: a
 * header repeated across receiving hops is kept as a list, and the name is
 * stored with whatever casing the message used. Authentication-Results is
 * usually both.
 */
function headerText(
  headers: Record<string, string | string[]> | undefined,
  name: string,
): string {
  if (!headers) return "";
  const wanted = name.toLowerCase();
  return Object.entries(headers)
    .filter(([key]) => key.toLowerCase() === wanted)
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
    .join(" ");
}

export default function EmailDetailPage() {
  const params = useParams();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (params.id) {
        try {
          const [emailData, scanData] = await Promise.all([
            getEmailById(params.id as string),
            getScanResult(params.id as string).catch(() => null)
          ]);
          setEmail(emailData);
          setScanResult(scanData);
        } catch (err) {
          console.error("Failed to load email details", err);
        } finally {
          setLoading(false);
        }
      }
    }
    loadData();
  }, [params.id]);

  if (loading) {
    return <div className="text-muted-foreground p-8">Loading analysis...</div>;
  }

  if (!email) {
    return <div className="text-red-400 p-8">Email not found or could not be loaded.</div>;
  }

  const riskLevel = email.risk_score > 80 ? "CRITICAL" : email.risk_score > 50 ? "HIGH" : "SAFE";
  const receivedAt = email.received_at || email.created_at;

  const authResults = headerText(email.raw_headers, "Authentication-Results");
  const spfMatch = authResults.match(/spf=([a-z]+)/i);
  const dkimMatch = authResults.match(/dkim=([a-z]+)/i);
  const dmarcMatch = authResults.match(/dmarc=([a-z]+)/i);
  
  const spf = spfMatch ? spfMatch[1].toUpperCase() : "NONE";
  const dkim = dkimMatch ? dkimMatch[1].toUpperCase() : "NONE";
  const dmarc = dmarcMatch ? dmarcMatch[1].toUpperCase() : "NONE";

  const allPassed = (spf === "PASS" || spf === "NONE") && 
                    (dkim === "PASS" || dkim === "NONE") && 
                    (dmarc === "PASS" || dmarc === "NONE");
  const authStatus = allPassed ? "PASSED" : "FAILED";

  const suspiciousUrls = scanResult?.findings?.urls || [];
  const perceptual = scanResult?.findings?.perceptual;
  const probe = scanResult?.findings?.probe;
  const audience = scanResult?.findings?.audience;
  const campaign = scanResult?.findings?.campaign;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/emails" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors w-max">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Emails
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">{email.subject || "No Subject"}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
            <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase mb-4 flex items-center gap-2 border-b border-border pb-4">
              <ShieldAlert className="w-4 h-4 text-violet-400" />
              Security Analysis
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Authentication</span>
                <Badge variant={authStatus === "FAILED" ? "blocked" : "safe"}>
                  {authStatus}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className={`border rounded-lg p-3 text-center ${spf === 'PASS' ? 'bg-emerald-500/10 border-emerald-500/20' : spf === 'NONE' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <div className="text-xs text-muted-foreground mb-1">SPF</div>
                  <div className={`text-sm font-semibold ${spf === 'PASS' ? 'text-emerald-400' : spf === 'NONE' ? 'text-amber-400' : 'text-red-400'}`}>{spf}</div>
                </div>
                <div className={`border rounded-lg p-3 text-center ${dkim === 'PASS' ? 'bg-emerald-500/10 border-emerald-500/20' : dkim === 'NONE' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <div className="text-xs text-muted-foreground mb-1">DKIM</div>
                  <div className={`text-sm font-semibold ${dkim === 'PASS' ? 'text-emerald-400' : dkim === 'NONE' ? 'text-amber-400' : 'text-red-400'}`}>{dkim}</div>
                </div>
                <div className={`border rounded-lg p-3 text-center ${dmarc === 'PASS' ? 'bg-emerald-500/10 border-emerald-500/20' : dmarc === 'NONE' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <div className="text-xs text-muted-foreground mb-1">DMARC</div>
                  <div className={`text-sm font-semibold ${dmarc === 'PASS' ? 'text-emerald-400' : dmarc === 'NONE' ? 'text-amber-400' : 'text-red-400'}`}>{dmarc}</div>
                </div>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase mt-8 mb-4 flex items-center gap-2 border-b border-border pb-4">
              <ShieldAlert className="w-4 h-4 text-violet-400" />
              Threat Scan
            </h3>

            <div className="space-y-3">
              <div className={`flex items-center justify-between p-3 rounded-lg ${riskLevel === "CRITICAL" ? "bg-red-500/5 border border-red-500/10" : "bg-foreground/5"}`}>
                <span className="text-sm text-gray-300">Overall Risk</span>
                <Badge variant={riskLevel === "CRITICAL" ? "blocked" : riskLevel === "HIGH" ? "suspicious" : "safe"}>
                  {riskLevel} ({email.risk_score.toFixed(1)})
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-foreground/5">
                <span className="text-sm text-gray-300">Status</span>
                <Badge variant={email.status === "blocked" ? "blocked" : email.status === "quarantined" ? "suspicious" : "safe"}>
                  {email.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            {scanResult && (
              <>
                <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase mt-8 mb-2 flex items-center gap-2 border-b border-border pb-4">
                  <ShieldAlert className="w-4 h-4 text-violet-400" />
                  Per-analyser findings
                </h3>
                {/* Each bar is what that analyser found on its own. The engine
                    combines them as independent evidence, so they do not sum to
                    the final score — showing them as slices of one bar would
                    describe a model this is not. */}
                <p className="text-xs text-muted-foreground mb-4">
                  Combined as independent evidence, not averaged — an analyser
                  finding nothing does not lower the score.
                </p>
                <div className="space-y-3">
                  {[
                    { label: "Header authentication", value: scanResult.header_score },
                    { label: "URLs", value: scanResult.url_score },
                    { label: "Attachments", value: scanResult.attachment_score },
                    { label: "Content analysis", value: scanResult.ai_score },
                    { label: "Perceptual divergence", value: scanResult.perceptual_score },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-gray-300">{row.label}</span>
                        <span className="text-muted-foreground font-mono">{row.value?.toFixed(0) ?? 0}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-foreground/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.value >= 60 ? "bg-red-500/70" : row.value >= 30 ? "bg-amber-500/70" : "bg-emerald-500/50"}`}
                          style={{ width: `${Math.min(Math.max(row.value || 0, 0), 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {scanResult.explanation && (
                  <p className="text-xs text-gray-300 leading-relaxed mt-5 pt-4 border-t border-border">
                    {scanResult.explanation}
                  </p>
                )}
              </>
            )}
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase mb-4 border-b border-border pb-4">
              Detected Entities
            </h3>
            
            <div className="space-y-4">
              {suspiciousUrls.length > 0 ? (
                <div>
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                    <LinkIcon className="w-3 h-3" /> Suspicious Links ({suspiciousUrls.length})
                  </div>
                  {suspiciousUrls.map((url: string, i: number) => (
                    <div key={i} className="p-3 bg-foreground/5 rounded-lg border border-red-500/20 text-red-400 break-all text-xs font-mono mb-2 last:mb-0">
                      {url}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No suspicious entities detected.</div>
              )}
            </div>
          </GlassCard>

        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <GlassCard className="h-full min-h-[600px] flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between bg-black/40 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
              </div>
              <div className="text-xs font-mono text-muted-foreground bg-foreground/5 px-3 py-1 rounded-full">
                Content Preview (Isolated)
              </div>
            </div>
            <div className="flex-1 p-8 overflow-y-auto bg-white/[0.01]">
              {/* The body runs in a sandboxed frame that blocks scripts and every
                  network fetch: it is hostile input, and this screen is where it
                  meets the person reviewing it. */}
              <div className="max-w-2xl mx-auto bg-white text-black rounded shadow-lg font-sans overflow-hidden">
                <SafeMessagePreview html={email.body_html} text={email.body_text} />
              </div>
              <p className="max-w-2xl mx-auto text-xs text-muted-foreground mt-3">
                Scripts are inert, remote images and tracking pixels are blocked,
                and links do not navigate.
              </p>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* What the numbers above are a claim about: the message as rendered,
          beside the text the classifier was given. */}
      {perceptual && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <DivergencePanel perceptual={perceptual} probe={probe} />
        </motion.div>
      )}

      <StabilityPanel result={scanResult?.findings?.stability} />
      <IsolationPanel result={scanResult?.findings?.isolation} />
      <AccessibilityPanel result={scanResult?.findings?.accessibility} />
      <SenderTrustPanel findings={scanResult?.findings} />

      {/* Two questions about the hidden half that its wording cannot settle:
          who it addresses, and whether it has arrived here before. */}
      {(audience?.ran || campaign?.ran) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <AudienceVerdict audience={audience} />
          <CampaignHistory campaign={campaign} />
        </motion.div>
      )}
    </div>
  );
}
