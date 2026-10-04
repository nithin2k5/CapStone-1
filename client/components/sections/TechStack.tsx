"use client";

import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";

const groups = [
  {
    label: "Frontend",
    items: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS v4", "Recharts"],
  },
  {
    label: "Backend",
    items: ["Python", "FastAPI", "SQLAlchemy", "Pydantic", "Uvicorn"],
  },
  {
    label: "Analysis",
    items: ["OpenAI API", "Google GenAI", "dkimpy", "dnspython", "html.parser"],
  },
  {
    label: "Platform",
    items: ["PostgreSQL", "SQLite", "Docker", "JWT", "Gmail + Graph APIs"],
  },
];

export default function TechStack() {
  return (
    <section className="py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Stack" title="What the gateway is built on" />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((group, i) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="glass-card p-5"
            >
              <h3 className="eyebrow">{group.label}</h3>
              <ul className="mt-4 space-y-2.5">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 text-[13px] text-muted-foreground"
                  >
                    <span className="h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
