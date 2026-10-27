"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ShieldAlert, ShieldCheck, Mail, AlertTriangle, X, CheckCircle2 } from "lucide-react";
import { fetchLiveGmailMessages, type EmailItem } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FIRST_STEP = "Initializing secure connection...";

// Narration while the request is in flight. The request is one call; these are
// the stages it stands for, shown so a scan that takes a few seconds does not
// look like a hung dialog.
const STEPS = [
  "Fetching recent inbox activity...",
  "Extracting raw email headers and metadata...",
  "Analyzing URLs and domains against threat intelligence...",
  "Scanning attachments for malware signatures...",
  "Applying AI phishing detection models...",
  "Finalizing risk scores...",
];

export function ScanModal({ isOpen, onClose }: ScanModalProps) {
  const [results, setResults] = useState<EmailItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState<string>(FIRST_STEP);

  // Not a fact worth storing: the modal is scanning exactly while it is open
  // and neither an answer nor a failure has arrived. As state it had to be set
  // synchronously by the effect that starts the scan, and could disagree with
  // the results beside it.
  const scanning = isOpen && results === null && error === null;

  useEffect(() => {
    if (!isOpen) {
      // Clear once the close animation is done, not during it.
      const reset = setTimeout(() => {
        setResults(null);
        setError(null);
        setScanStep(FIRST_STEP);
      }, 300);
      return () => clearTimeout(reset);
    }

    let cancelled = false;
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      if (stepIndex >= STEPS.length) {
        clearInterval(stepInterval);
        return;
      }
      setScanStep(STEPS[stepIndex]);
      stepIndex++;
    }, 800);

    (async () => {
      try {
        const data = await fetchLiveGmailMessages("inbox", 10);
        if (cancelled) return;
        setScanStep("Scan complete!");
        setResults(data.items || []);
      } catch {
        if (cancelled) return;
        setError("Failed to complete email scan. Please check your connection.");
      } finally {
        clearInterval(stepInterval);
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(stepInterval);
    };
  }, [isOpen]);

  const safeCount = results?.filter(r => r.status === "safe").length || 0;
  const blockedCount = results?.filter(r => r.status === "blocked").length || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-3xl glass-card border border-border rounded-2xl overflow-hidden flex flex-col max-h-[85vh] bg-card"
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/40">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-subtle rounded-lg border border-accent/30">
                  <Mail className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-semibold text-foreground">Live Inbox Scan</h2>
                  <p className="text-xs text-muted-foreground">Evaluating threats in memory</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-foreground/10 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-accent-subtle blur-xl rounded-full" />
                    <Loader2 className="w-16 h-16 text-accent animate-spin relative z-10" />
                  </div>
                  <h3 className="text-xl font-medium text-foreground mb-2">Analyzing Inbox</h3>
                  <p className="text-sm text-muted-foreground max-w-sm animate-pulse">
                    {scanStep}
                  </p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--danger)]">
                  <AlertTriangle className="w-12 h-12 mb-4" />
                  <p>{error}</p>
                </div>
              ) : results ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-secondary/40">
                    <div className="flex-1 flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-[var(--success)]/10 text-[var(--success)]">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Safe Deliveries</p>
                        <p className="text-2xl font-bold text-foreground">{safeCount}</p>
                      </div>
                    </div>
                    <div className="w-px h-12 bg-border" />
                    <div className="flex-1 flex items-center gap-3 pl-4">
                      <div className="p-2.5 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)]">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Threats Blocked</p>
                        <p className="text-2xl font-bold text-foreground">{blockedCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {results.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No emails found to scan.</p>
                    ) : (
                      results.map((email, i) => (
                        <motion.div 
                          key={email.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="p-4 rounded-xl border border-border bg-secondary/40 flex items-center gap-4 hover:bg-secondary transition-colors"
                        >
                          <div className={cn(
                            "p-2 rounded-full border",
                            email.status === "blocked" 
                              ? "bg-[var(--danger)]/10 border-[var(--danger)]/30 text-[var(--danger)]" 
                              : "bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]"
                          )}>
                            {email.status === "blocked" ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground truncate max-w-[200px]">
                                {email.sender.includes('<') ? email.sender.split('<')[0] : email.sender}
                              </span>
                              <span className="text-xs text-muted-foreground">{email.received_at ? new Date(email.received_at).toLocaleTimeString() : ""}</span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{email.subject}</p>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground mb-1">Risk Score</p>
                              <p className={cn(
                                "text-sm font-bold",
                                email.risk_score >= 80 ? "text-[var(--danger)]" :
                                email.risk_score >= 50 ? "text-[var(--warning)]" :
                                "text-[var(--success)]"
                              )}>
                                {email.risk_score.toFixed(0)}/100
                              </p>
                            </div>
                            <Badge variant={email.status === "blocked" ? "blocked" : "safe"}>
                              {email.status === "blocked" ? "SPAM" : "INBOX"}
                            </Badge>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {!scanning && results && (
              <div className="p-6 border-t border-border bg-secondary/40 flex justify-end">
                <button 
                  onClick={onClose}
                  className="px-6 py-2 bg-accent-solid text-foreground font-medium rounded-xl hover:bg-accent-solid transition-colors shadow-lg shadow-violet-500/20"
                >
                  Done
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
