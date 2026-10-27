"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Link as LinkIcon,
  RefreshCw,
  Fingerprint,
  Gauge,
  Lock,
  User,
  AtSign,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getEmailById, EmailDetail, getScanResult, rescanEmail, ScanResult } from "@/lib/api";
import { DivergencePanel } from "@/components/security/DivergencePanel";
import { StabilityPanel } from "@/components/security/StabilityPanel";
import { IsolationPanel } from "@/components/security/IsolationPanel";
import { AccessibilityPanel } from "@/components/security/AccessibilityPanel";
import { SenderTrustPanel } from "@/components/security/SenderTrustPanel";
import { AudienceVerdict } from "@/components/security/AudienceVerdict";
import { CampaignHistory } from "@/components/security/CampaignHistory";
import { SafeMessagePreview } from "@/components/security/SafeMessagePreview";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

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

function fetchDetail(id: string) {
  return Promise.all([getEmailById(id), getScanResult(id).catch(() => null)]);
}

function riskColor(score: number) {
  if (score > 80) return "var(--danger)";
  if (score > 50) return "var(--warning)";
  return "var(--success)";
}

function authColor(result: string) {
  if (result === "PASS") return "var(--success)";
  if (result === "NONE") return "var(--warning)";
  return "var(--danger)";
}

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as const },
});

function SectionTitle({ icon: Icon, children }: { icon: typeof ShieldAlert; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-accent" />
      {children}
    </h3>
  );
}

export default function EmailDetailPage() {
  const params = useParams();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [rescanning, setRescanning] = useState(false);
  const [rescanError, setRescanError] = useState("");

  useEffect(() => {
    if (!params.id) return;
    fetchDetail(params.id as string)
      .then(([emailData, scanData]) => {
        setEmail(emailData);
        setScanResult(scanData);
      })
      .catch((err) => console.error("Failed to load email details", err))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleRescan = async () => {
    if (!params.id) return;
    setRescanning(true);
    setRescanError("");
    try {
      await rescanEmail(params.id as string);
      // The email row carries the updated score and status; read both back.
      const [emailData, scanData] = await fetchDetail(params.id as string);
      setEmail(emailData);
      setScanResult(scanData);
    } catch (err) {
      setRescanError(err instanceof Error ? err.message : "Re-scan failed.");
    } finally {
      setRescanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[520px] rounded-2xl" />
          <Skeleton className="h-[520px] rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <GlassCard className="flex flex-col items-center p-12 text-center">
        <ShieldAlert className="h-8 w-8 text-[var(--danger)]" />
        <p className="mt-3 text-foreground">Email not found or could not be loaded.</p>
        <Link href="/emails" className="btn-secondary mt-6 px-4 py-2 text-[13px]">
          <ArrowLeft className="h-4 w-4" /> Back to emails
        </Link>
      </GlassCard>
    );
  }

  const riskLevel = email.risk_score > 80 ? "CRITICAL" : email.risk_score > 50 ? "HIGH" : "SAFE";
  const receivedAt = email.received_at || email.created_at;
  const color = riskColor(email.risk_score);

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

  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <Link
        href="/emails"
        className="inline-flex w-max items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        back to emails
      </Link>

      {/* Verdict header */}
      <motion.div {...rise(0)} className="panel brackets relative overflow-hidden p-6">
        <div className="hex-bg pointer-events-none absolute inset-0 opacity-60" />
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full opacity-20 blur-3xl"
          style={{ background: color }}
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
          {/* Risk dial */}
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--secondary)" strokeWidth="7" />
              <motion.circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference - (Math.min(100, email.risk_score) / 100) * circumference }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{ filter: `drop-shadow(0 0 5px ${color})` }}
              />
            </svg>
            <div className="text-center">
              <div className="display text-[1.9rem] leading-none text-foreground">
                {email.risk_score.toFixed(0)}
              </div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                risk
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={riskLevel === "CRITICAL" ? "blocked" : riskLevel === "HIGH" ? "suspicious" : "safe"}>
                {riskLevel}
              </Badge>
              <Badge variant={email.status === "blocked" ? "blocked" : email.status === "quarantined" ? "suspicious" : "safe"}>
                {email.status}
              </Badge>
              <Badge variant={authStatus === "FAILED" ? "blocked" : "safe"}>auth {authStatus}</Badge>
            </div>
            <h2 className="display mt-3 break-words text-[1.45rem] text-foreground sm:text-[1.7rem]">
              {email.subject || "No Subject"}
            </h2>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
              <div className="flex min-w-0 items-center gap-2">
                <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <dt className="sr-only">From</dt>
                <dd className="truncate font-mono text-[12px] text-foreground/90">{email.sender}</dd>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <AtSign className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <dt className="sr-only">To</dt>
                <dd className="truncate font-mono text-[12px] text-foreground/90">{email.recipient}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <dt className="sr-only">Received</dt>
                <dd className="font-mono text-[12px] text-foreground/90">
                  {receivedAt ? new Date(receivedAt).toLocaleString() : "Unknown"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 lg:items-end">
            <button
              type="button"
              onClick={handleRescan}
              disabled={rescanning}
              className="btn-primary px-5 py-2.5 text-[13px] disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", rescanning && "animate-spin")} />
              {rescanning ? "Re-scanning…" : "Re-scan"}
            </button>
            {rescanError && (
              <p className="max-w-xs text-[12px] text-[var(--danger)]">{rescanError}</p>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div {...rise(0.08)} className="space-y-6 lg:col-span-1">
          {/* Authentication */}
          <GlassCard className="p-6">
            <SectionTitle icon={Fingerprint}>authentication</SectionTitle>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { name: "SPF", value: spf },
                { name: "DKIM", value: dkim },
                { name: "DMARC", value: dmarc },
              ].map((a) => {
                const c = authColor(a.value);
                return (
                  <div
                    key={a.name}
                    className="rounded-xl border p-3 text-center"
                    style={{
                      borderColor: `color-mix(in srgb, ${c} 30%, var(--border))`,
                      background: `color-mix(in srgb, ${c} 8%, transparent)`,
                    }}
                  >
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {a.name}
                    </div>
                    <div className="mt-1 font-mono text-[13px] font-bold" style={{ color: c }}>
                      {a.value}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Analysers */}
          {scanResult && (
            <GlassCard className="p-6">
              <SectionTitle icon={Gauge}>per-analyser findings</SectionTitle>
              {/* Each bar is what that analyser found on its own. The engine
                  combines them as independent evidence, so they do not sum to
                  the final score — showing them as slices of one bar would
                  describe a model this is not. */}
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                Combined as independent evidence, not averaged — an analyser
                finding nothing does not lower the score.
              </p>
              <div className="mt-5 space-y-3.5">
                {[
                  { label: "Header authentication", value: scanResult.header_score },
                  { label: "URLs", value: scanResult.url_score },
                  { label: "Attachments", value: scanResult.attachment_score },
                  { label: "Content analysis", value: scanResult.ai_score },
                  { label: "Perceptual divergence", value: scanResult.perceptual_score },
                ].map((row, i) => {
                  const v = Math.min(Math.max(row.value || 0, 0), 100);
                  const c = v >= 60 ? "var(--danger)" : v >= 30 ? "var(--warning)" : "var(--success)";
                  return (
                    <div key={row.label}>
                      <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                        <span className="text-foreground/90">{row.label}</span>
                        <span className="font-mono" style={{ color: c }}>{v.toFixed(0)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: c, boxShadow: `0 0 8px ${c}` }}
                          initial={{ width: 0 }}
                          animate={{ width: `${v}%` }}
                          transition={{ duration: 0.8, delay: 0.2 + i * 0.06 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {scanResult.explanation && (
                <p className="mt-5 border-t border-border pt-4 text-[12.5px] leading-relaxed text-foreground/90">
                  {scanResult.explanation}
                </p>
              )}
            </GlassCard>
          )}

          {/* Entities */}
          <GlassCard className="p-6">
            <SectionTitle icon={LinkIcon}>detected entities</SectionTitle>
            <div className="mt-4">
              {suspiciousUrls.length > 0 ? (
                <div className="space-y-2">
                  <div className="font-mono text-[11px] text-muted-foreground">
                    suspicious links · {suspiciousUrls.length}
                  </div>
                  {suspiciousUrls.map((url: string, i: number) => (
                    <div
                      key={i}
                      className="break-all rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-3 font-mono text-[11.5px] text-[var(--danger)]"
                    >
                      {url}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-[var(--success)]" />
                  No suspicious entities detected.
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Isolated preview */}
        <motion.div {...rise(0.14)} className="lg:col-span-2">
          <GlassCard className="flex h-full min-h-[600px] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-secondary/60 px-4 py-3">
              <div className="flex gap-2">
                <span className="h-3 w-3 rounded-full bg-[var(--danger)]/70" />
                <span className="h-3 w-3 rounded-full bg-[var(--warning)]/70" />
                <span className="h-3 w-3 rounded-full bg-[var(--success)]/70" />
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-accent">
                <Lock className="h-3 w-3" />
                sandboxed preview
              </div>
            </div>
            <div className="relative flex-1 overflow-y-auto p-6 sm:p-8">
              <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
              {/* The body runs in a sandboxed frame that blocks scripts and every
                  network fetch: it is hostile input, and this screen is where it
                  meets the person reviewing it. */}
              <div className="relative mx-auto max-w-2xl overflow-hidden rounded-xl bg-white font-sans text-black shadow-[var(--glow-3)] ring-1 ring-border">
                <SafeMessagePreview html={email.body_html} text={email.body_text} />
              </div>
              <p className="relative mx-auto mt-3 max-w-2xl font-mono text-[11px] text-muted-foreground">
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
        <motion.div {...rise(0.2)}>
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
        <motion.div {...rise(0.25)} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AudienceVerdict audience={audience} />
          <CampaignHistory campaign={campaign} />
        </motion.div>
      )}
    </div>
  );
}
