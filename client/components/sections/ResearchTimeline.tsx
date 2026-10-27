"use client";

import { motion } from "framer-motion";
import { Check, Loader } from "lucide-react";
import SectionHeading from "./SectionHeading";

const phases = [
  {
    phase: "Phase 1",
    title: "Authentication baseline",
    description:
      "SPF and DMARC read from the delivering server, DKIM re-verified locally against the signing domain’s published key so the verdict does not rest on a header the sender could write.",
    status: "complete",
  },
  {
    phase: "Phase 2",
    title: "Link and payload heuristics",
    description:
      "Typosquatting, punycode and mixed-script lookalikes, shorteners and reputation checks; dangerous extensions, macro-bearing documents and nested archives.",
    status: "complete",
  },
  {
    phase: "Phase 3",
    title: "Dual-channel extraction",
    description:
      "Parse each message twice — rendered and machine-visible — across twenty-four concealment channels, from display:none and zero-size text to matched foreground colours and invisible codepoints.",
    status: "complete",
  },
  {
    phase: "Phase 4",
    title: "Injection scoring and confidence inversion",
    description:
      "Classify concealed text against eight families of analyser-directed instruction, and invert the content verdict when a message hides instructions yet scores clean.",
    status: "complete",
  },
  {
    phase: "Phase 5",
    title: "Calibration and evasion testing",
    description:
      "Reliability ceilings are still hand-chosen; fitting them needs labelled mail this project does not have. Pattern matching is literal, so paraphrase evades it where the volume and script signals do not. Those two are the open problems.",
    status: "in progress",
  },
] as const;

export default function ResearchTimeline() {
  return (
    <section id="research" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Research"
          title={
            <>
              Research <span className="text-gradient">trajectory</span>
            </>
          }
          description="How the system arrived at the perceptual layer, and what remains unsolved in it."
        />

        {/* Progress meter */}
        <div className="mx-auto mt-12 max-w-3xl">
          <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.16em]">
            <span className="text-muted-foreground">research progress</span>
            <span className="text-accent">
              {phases.filter((p) => p.status === "complete").length} / {phases.length} phases
            </span>
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, var(--accent-solid), var(--accent-2))",
                boxShadow: "0 0 14px var(--accent)",
              }}
              initial={{ width: 0 }}
              whileInView={{
                width: `${(phases.filter((p) => p.status === "complete").length / phases.length) * 100}%`,
              }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        <ol className="relative mx-auto mt-12 max-w-3xl">
          {phases.map((phase, i) => {
            const done = phase.status === "complete";
            const last = i === phases.length - 1;

            return (
              <motion.li
                key={phase.phase}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex gap-6"
              >
                {/* Rail */}
                <div className="flex flex-col items-center">
                  <span
                    className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                      done ? "glow-accent" : "glow-accent-2"
                    }`}
                    style={{
                      borderColor: done
                        ? "color-mix(in srgb, var(--accent) 45%, var(--border))"
                        : "color-mix(in srgb, var(--accent-2) 45%, var(--border))",
                      background: done
                        ? "var(--accent-subtle)"
                        : "var(--accent-2-subtle)",
                      color: done ? "var(--accent)" : "var(--accent-2)",
                    }}
                  >
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Loader className="h-4 w-4 animate-spin" />
                    )}
                  </span>

                  {!last && (
                    <span
                      className="w-px flex-1"
                      style={{
                        background:
                          "linear-gradient(to bottom, var(--accent), var(--border) 70%)",
                        opacity: 0.4,
                      }}
                    />
                  )}
                </div>

                {/* Card */}
                <div className={last ? "pb-0" : "pb-9"}>
                  <div
                    className={`panel-lift accent-rule overflow-hidden p-6 ${
                      done ? "" : "panel-lift-2"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                        {phase.phase}
                      </span>
                      <span
                        className="pill"
                        style={{
                          borderColor: done
                            ? "color-mix(in srgb, var(--accent) 32%, var(--border))"
                            : "color-mix(in srgb, var(--accent-2) 32%, var(--border))",
                          background: done
                            ? "var(--accent-subtle)"
                            : "var(--accent-2-subtle)",
                          color: done ? "var(--accent)" : "var(--accent-2)",
                        }}
                      >
                        {phase.status}
                      </span>
                    </div>

                    <h3 className="display mt-3 text-[17px] text-foreground">
                      {phase.title}
                    </h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                      {phase.description}
                    </p>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
