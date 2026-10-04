"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
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
      "Parse each message twice — rendered and machine-visible — across seventeen concealment channels, from display:none and zero-size text to matched foreground colours and invisible codepoints.",
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
      "The risk weights are hand-chosen and compose until they saturate the cap; pattern matching is literal, so paraphrase evades it where the volume and script signals do not. Fitting the weights to a labelled corpus and measuring paraphrase robustness are the open problems.",
    status: "in progress",
  },
] as const;

export default function ResearchTimeline() {
  return (
    <section id="research" className="py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Research"
          title="How the system arrived at the perceptual layer"
          description="Four phases shipped, and one still open — including the limitations we have not solved."
        />

        <ol className="mx-auto mt-14 max-w-3xl">
          {phases.map((phase, i) => {
            const done = phase.status === "complete";
            const last = i === phases.length - 1;

            return (
              <motion.li
                key={phase.phase}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.35 }}
                className="relative flex gap-5 sm:gap-6"
              >
                {/* Rail */}
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                      done
                        ? "border-accent/40 bg-[var(--accent-subtle)] text-accent"
                        : "border-border bg-secondary text-muted-foreground"
                    }`}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  {!last && <span className="w-px flex-1 bg-border" />}
                </div>

                {/* Content */}
                <div className={last ? "pb-0" : "pb-10"}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      {phase.phase}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        done
                          ? "bg-[var(--accent-subtle)] text-accent"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {phase.status}
                    </span>
                  </div>

                  <h3 className="mt-2 text-[15px] font-semibold text-foreground">
                    {phase.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {phase.description}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
