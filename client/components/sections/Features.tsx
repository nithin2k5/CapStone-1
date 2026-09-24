"use client";

import { motion } from "framer-motion";
import { MailSearch, Globe, EyeOff, BrainCircuit, Scale, Activity } from "lucide-react";

const features = [
  {
    title: "Perceptual Divergence Analysis",
    description: "Extract the message twice \u2014 once as the recipient renders it, once as the classifier ingests it \u2014 and score the gap. Concealment is treated as evidence, not noise to strip.",
    icon: EyeOff,
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    title: "Prompt Injection Detection",
    description: "Match concealed text against eight classes of instruction aimed at the analyser: instruction override, role hijack, impersonated system turns, verdict forcing, suppression, schema hijack, task reassignment, refusal triggers.",
    icon: BrainCircuit,
    gradient: "from-teal-500 to-blue-500",
  },
  {
    title: "Inverted Confidence Rule",
    description: "Concealed instructions plus a calm content verdict multiply risk by 2.5x. Either the injection worked or it was neutralised \u2014 the intent is established either way.",
    icon: Scale,
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    title: "Cryptographic Header Checks",
    description: "DKIM signatures re-verified against the signing domain\u2019s published key rather than trusting the Authentication-Results header, with SPF and DMARC read as delivered.",
    icon: MailSearch,
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    title: "URL & Attachment Heuristics",
    description: "Homograph and mixed-script lookalikes, punycode, shorteners and domain reputation; dangerous extensions, macro-bearing documents and nested archives.",
    icon: Globe,
    gradient: "from-purple-500 to-fuchsia-500",
  },
  {
    title: "Explained Verdicts",
    description: "Every score arrives with the findings that produced it \u2014 which channel concealed what, which pattern matched, which combination compounded.",
    icon: Activity,
    gradient: "from-fuchsia-500 to-purple-400",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 relative z-10 bg-black">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl md:text-5xl font-bold mb-6 text-foreground"
          >
            Detection Behind the <span className="text-gradient">Filter</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg"
          >
            Five analysers score each message independently. Four of them ask whether the mail is malicious to the reader; the fifth asks whether the reader and the classifier were shown the same mail.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -6 }}
              className="glass-card p-8 rounded-2xl relative overflow-hidden group border-indigo-500/20 hover:border-purple-500/50 hover:shadow-[0_0_35px_rgba(139,92,246,0.22)] transition-all duration-300 bg-neutral-950/90"
            >
              {/* Top accent gradient line */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} opacity-70 group-hover:opacity-100 transition-opacity`} />

              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-purple-500/10 border border-purple-500/30 group-hover:border-purple-400/60 shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all">
                <feature.icon className="w-7 h-7 text-purple-400 group-hover:text-blue-300 transition-colors duration-300" />
              </div>

              <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-purple-300 transition-colors duration-300">
                {feature.title}
              </h3>

              <p className="text-muted-foreground leading-relaxed group-hover:text-gray-300 transition-colors">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
