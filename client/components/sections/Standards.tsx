"use client";

import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle,
  Fingerprint,
  MailCheck,
  BookMarked,
  ShieldCheck,
} from "lucide-react";
import SectionHeading from "./SectionHeading";

const implemented = [
  { name: "RFC 5322", icon: FileText, desc: "Internet Message Format" },
  { name: "SPF", icon: CheckCircle, desc: "Sender Policy Framework" },
  { name: "DKIM", icon: Fingerprint, desc: "DomainKeys Identified Mail" },
  { name: "DMARC", icon: MailCheck, desc: "Domain-based authentication" },
];

const referenced = [
  {
    name: "NIST SP 800-45",
    icon: BookMarked,
    desc: "Guidelines on Electronic Mail Security",
  },
  {
    name: "OWASP LLM Top 10",
    icon: ShieldCheck,
    desc: "LLM01 prompt injection informs the threat model",
  },
];

export default function Standards() {
  return (
    <section className="relative border-y border-border bg-secondary/40 py-24 sm:py-32">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Standards"
          tone="accent-2"
          title={
            <>
              Built on{" "}
              <span className="text-gradient-blue">published specifications</span>
            </>
          }
          description="The authentication layer implements the mail standards directly. The threat model is written against published security guidance."
        />

        <div className="mt-16">
          <h3 className="eyebrow">
            <span className="h-px w-6 bg-accent" />
            implemented in the gateway
          </h3>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {implemented.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
                className="panel-lift accent-rule group flex flex-col items-center overflow-hidden p-6 text-center"
              >
                <span className="chip h-12 w-12">
                  <item.icon className="h-5 w-5" />
                </span>
                <h4 className="display mt-5 text-[15px] text-foreground">
                  {item.name}
                </h4>
                <p className="mt-2 text-[12.5px] leading-snug text-muted-foreground">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <h3 className="eyebrow eyebrow-2">
            <span className="h-px w-6 bg-accent-2" />
            guidance referenced
          </h3>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {referenced.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
                className="panel-lift panel-lift-2 group flex items-start gap-4 p-6"
              >
                <span className="chip chip-2 h-11 w-11 shrink-0">
                  <item.icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h4 className="display text-[15px] text-foreground">
                    {item.name}
                  </h4>
                  <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="mt-10 border-l-2 pl-5 text-[13px] leading-relaxed text-muted-foreground"
          style={{ borderColor: "color-mix(in srgb, var(--warning) 55%, var(--border))" }}
        >
          This is a research project, not a certified product. Implementing these
          specifications is not the same as holding a compliance certification
          against them.
        </p>
      </div>
    </section>
  );
}
