"use client";

import { motion } from "framer-motion";
import {
  MailSearch,
  Globe,
  EyeOff,
  BrainCircuit,
  Scale,
  Activity,
} from "lucide-react";
import SectionHeading from "./SectionHeading";

/** Class labels exactly as perceptual_analysis.INSTRUCTION_PATTERNS names them. */
const injectionClasses = [
  "instruction override",
  "role hijack",
  "impersonated system turn",
  "verdict forcing",
  "suppression request",
  "output schema hijack",
  "task reassignment",
  "refusal trigger",
];

const ease = [0.22, 1, 0.36, 1] as const;

function Card({
  children,
  className = "",
  delay = 0,
  tone = "accent",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  tone?: "accent" | "accent-2";
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay, ease }}
      className={`panel-lift accent-rule group relative overflow-hidden p-7 ${
        tone === "accent-2" ? "panel-lift-2" : ""
      } ${className}`}
    >
      {children}
    </motion.article>
  );
}

function CardHead({
  icon: Icon,
  tag,
  tone = "accent",
}: {
  icon: typeof EyeOff;
  tag: string;
  tone?: "accent" | "accent-2";
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className={`chip h-12 w-12 ${tone === "accent-2" ? "chip-2" : ""}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
        {tag}
      </span>
    </div>
  );
}

export default function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Detection"
          title={
            <>
              Detection behind the <span className="text-gradient">filter</span>
            </>
          }
          description="Five analysers score each message independently. Four of them ask whether the mail is malicious to the reader; the fifth asks whether the reader and the classifier were shown the same mail."
        />

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-6">
          {/* Perceptual divergence: the flagship, wide */}
          <Card className="lg:col-span-4">
            <CardHead icon={EyeOff} tag="0.85 ceiling" />
            <h3 className="display mt-6 text-[20px] text-foreground">
              Perceptual divergence analysis
            </h3>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
              Extract the message twice — once as the recipient renders it, once
              as the classifier ingests it — and score the gap. Concealment is
              treated as evidence, not noise to strip.
            </p>

            {/* Two bars: rendered vs machine-visible text volume */}
            <div className="mt-7 space-y-3 font-mono text-[11px] uppercase tracking-[0.14em]">
              {[
                { label: "rendered", pct: 29, color: "var(--accent)" },
                { label: "machine", pct: 100, color: "var(--accent-2)" },
              ].map((row, i) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-muted-foreground">
                    {row.label}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: row.color,
                        boxShadow: `0 0 12px ${row.color}`,
                      }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${row.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.2 + i * 0.15, ease }}
                    />
                  </div>
                  <span className="w-10 text-right text-foreground">{row.pct}%</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Inverted confidence rule */}
          <Card className="lg:col-span-2" delay={0.08}>
            <CardHead icon={Scale} tag="0.75 evidence" />
            <h3 className="display mt-6 text-[17px] text-foreground">
              Inverted confidence rule
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              Concealed instructions plus a calm content verdict add their own
              evidence term — the strongest combination the engine recognises.
            </p>
            <div className="mt-6 rounded-xl border border-border bg-elevated px-4 py-3 font-mono text-[11.5px] leading-relaxed text-muted-foreground">
              <span className="text-accent">if</span> hidden ∧ calm{" "}
              <span className="text-accent">→</span> +0.75
            </div>
          </Card>

          {/* Prompt injection: the 8 classes as chips */}
          <Card className="md:col-span-2 lg:col-span-3" delay={0.04}>
            <CardHead icon={BrainCircuit} tag="8 classes" />
            <h3 className="display mt-6 text-[17px] text-foreground">
              Prompt injection detection
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              Concealed text is matched against eight classes of instruction aimed
              at the analyser rather than the reader.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {injectionClasses.map((c, i) => (
                <motion.span
                  key={c}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.25, delay: 0.2 + i * 0.05 }}
                  className="pill"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--accent) 30%, var(--border))",
                    background: "var(--accent-subtle)",
                    color: "var(--accent)",
                  }}
                >
                  {c}
                </motion.span>
              ))}
            </div>
          </Card>

          {/* Explained verdicts */}
          <Card className="lg:col-span-3" delay={0.1} tone="accent-2">
            <CardHead icon={Activity} tag="Evidence-backed" tone="accent-2" />
            <h3 className="display mt-6 text-[17px] text-foreground">
              Explained verdicts
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              Every score arrives with the findings that produced it — which
              channel concealed what, which pattern matched, which combination
              compounded.
            </p>
            <div className="mt-6 space-y-1.5 font-mono text-[11.5px]">
              <div className="text-muted-foreground">
                <span className="text-accent-2">›</span> display-none hid 412 chars
              </div>
              <div className="text-muted-foreground">
                <span className="text-accent-2">›</span> matched: verdict forcing
              </div>
              <div className="text-muted-foreground">
                <span className="text-accent-2">›</span> compounded: concealment + calm
              </div>
            </div>
          </Card>

          {/* Headers */}
          <Card className="lg:col-span-3" delay={0.04} tone="accent-2">
            <CardHead icon={MailSearch} tag="SPF · DKIM · DMARC" tone="accent-2" />
            <h3 className="display mt-6 text-[17px] text-foreground">
              Cryptographic header checks
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              DKIM signatures re-verified against the signing domain’s published
              key rather than trusting the Authentication-Results header, with
              SPF and DMARC read as delivered.
            </p>
          </Card>

          {/* URLs + attachments */}
          <Card className="md:col-span-2 lg:col-span-3" delay={0.1} tone="accent-2">
            <CardHead icon={Globe} tag="Link + payload" tone="accent-2" />
            <h3 className="display mt-6 text-[17px] text-foreground">
              URL and attachment heuristics
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              Homograph and mixed-script lookalikes, punycode, shorteners and
              domain reputation; dangerous extensions, macro-bearing documents and
              nested archives.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
