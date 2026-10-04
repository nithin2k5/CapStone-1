"use client";

import { motion } from "framer-motion";

type Props = {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
  tone?: "accent" | "accent-2";
};

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "accent",
}: Props) {
  const centered = align === "center";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}
    >
      <span className={`eyebrow ${tone === "accent-2" ? "eyebrow-2" : ""}`}>
        <span
          className="h-px w-6"
          style={{
            background:
              tone === "accent-2" ? "var(--accent-2)" : "var(--accent)",
          }}
        />
        {eyebrow}
      </span>

      <h2 className="display mt-4 text-[2rem] text-foreground sm:text-[2.6rem]">
        {title}
      </h2>

      {description && (
        <p
          className={`mt-5 text-[16px] leading-relaxed text-muted-foreground ${
            centered ? "" : ""
          }`}
        >
          {description}
        </p>
      )}
    </motion.div>
  );
}
