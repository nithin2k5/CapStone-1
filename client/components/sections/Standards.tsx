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
  {
    name: "RFC 5322",
    icon: FileText,
    desc: "Internet Message Format — header and body parsing",
  },
  {
    name: "SPF",
    icon: CheckCircle,
    desc: "Sender Policy Framework result read as delivered",
  },
  {
    name: "DKIM",
    icon: Fingerprint,
    desc: "Signatures re-verified against the published key",
  },
  {
    name: "DMARC",
    icon: MailCheck,
    desc: "Alignment and policy evaluated per message",
  },
];

const guidance = [
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
    <section className="border-t border-border bg-secondary/40 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Standards"
          title="Specifications implemented, and guidance followed"
          description="The authentication layer implements the mail standards directly. The threat model is written against published security guidance."
        />

        <div className="mt-14">
          <h3 className="eyebrow">Implemented in the gateway</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {implemented.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="glass-card group p-5"
              >
                <item.icon className="h-[18px] w-[18px] text-muted-foreground transition-colors group-hover:text-accent" />
                <h4 className="mt-4 font-mono text-[13px] font-medium text-foreground">
                  {item.name}
                </h4>
                <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <h3 className="eyebrow">Guidance referenced</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {guidance.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="glass-card group flex items-start gap-4 p-5"
              >
                <item.icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground transition-colors group-hover:text-accent" />
                <div>
                  <h4 className="text-[13px] font-medium text-foreground">
                    {item.name}
                  </h4>
                  <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="mt-8 text-[13px] leading-relaxed text-muted-foreground">
          This is a research project, not a certified product. Implementing these
          specifications is not the same as holding a compliance certification
          against them.
        </p>
      </div>
    </section>
  );
}
