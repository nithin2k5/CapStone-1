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
    weight: "0.85 ceiling",
    primary: true,
  },
  {
    title: "Prompt injection detection",
    description:
      "Match concealed text against eight classes of instruction aimed at the analyser: instruction override, role hijack, impersonated system turns, verdict forcing, suppression, schema hijack, task reassignment, refusal triggers.",
    icon: BrainCircuit,
    weight: "8 classes",
    primary: true,
  },
  {
    title: "Inverted confidence rule",
    description:
      "Concealed instructions plus a calm content verdict add their own evidence term, weighted 0.75 — the strongest combination the engine recognises. Either the injection worked or it was neutralised; the intent is established either way.",
    icon: Scale,
    weight: "0.75 evidence",
    primary: true,
  },
  {
    title: "Cryptographic header checks",
    description:
      "DKIM signatures re-verified against the signing domain’s published key rather than trusting the Authentication-Results header, with SPF and DMARC read as delivered.",
    icon: MailSearch,
    weight: "SPF · DKIM · DMARC",
  },
  {
    title: "URL and attachment heuristics",
    description:
      "Homograph and mixed-script lookalikes, punycode, shorteners and domain reputation; dangerous extensions, macro-bearing documents and nested archives.",
    icon: Globe,
    weight: "Link + payload",
  },
  {
    title: "Explained verdicts",
    description:
      "Every score arrives with the findings that produced it — which channel concealed what, which pattern matched, which combination compounded.",
    icon: Activity,
    weight: "Evidence-backed",
  },
];

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

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className={`panel-lift accent-rule group overflow-hidden p-7 ${
                feature.primary ? "" : "panel-lift-2"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <span
                  className={`chip h-12 w-12 ${feature.primary ? "" : "chip-2"}`}
                >
                  <feature.icon className="h-5 w-5" />
                </span>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                  {feature.weight}
                </span>
              </div>

              <h3 className="display mt-6 text-[17px] text-foreground">
                {feature.title}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
