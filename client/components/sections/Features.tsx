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

const features = [
  {
    title: "Perceptual divergence analysis",
    description:
      "Extract the message twice — once as the recipient renders it, once as the classifier ingests it — and score the gap. Concealment is treated as evidence, not noise to strip.",
    icon: EyeOff,
  },
  {
    title: "Prompt injection detection",
    description:
      "Match concealed text against eight classes of instruction aimed at the analyser: instruction override, role hijack, impersonated system turns, verdict forcing, suppression, schema hijack, task reassignment, refusal triggers.",
    icon: BrainCircuit,
  },
  {
    title: "Inverted confidence rule",
    description:
      "Concealed instructions plus a calm content verdict multiply risk by 2.5×. Either the injection worked or it was neutralised — the intent is established either way.",
    icon: Scale,
  },
  {
    title: "Cryptographic header checks",
    description:
      "DKIM signatures re-verified against the signing domain’s published key rather than trusting the Authentication-Results header, with SPF and DMARC read as delivered.",
    icon: MailSearch,
  },
  {
    title: "URL and attachment heuristics",
    description:
      "Homograph and mixed-script lookalikes, punycode, shorteners and domain reputation; dangerous extensions, macro-bearing documents and nested archives.",
    icon: Globe,
  },
  {
    title: "Explained verdicts",
    description:
      "Every score arrives with the findings that produced it — which channel concealed what, which pattern matched, which combination compounded.",
    icon: Activity,
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Detection"
          title="Five analysers, scored independently"
          description="Four of them ask whether the mail is malicious to the reader. The fifth asks whether the reader and the classifier were shown the same mail."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35, delay: (i % 3) * 0.07 }}
              className="glass-card group p-6"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition-colors group-hover:border-accent/40 group-hover:bg-[var(--accent-subtle)] group-hover:text-accent">
                <feature.icon className="h-[18px] w-[18px]" />
              </span>

              <h3 className="mt-5 text-[15px] font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
