"use client";

import SectionHeading from "./SectionHeading";

/** Read off package.json and requirements.txt — not aspirational. */
const technologies = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "Tailwind CSS v4",
  "Framer Motion",
  "Recharts",
  "Python",
  "FastAPI",
  "SQLAlchemy",
  "Pydantic",
  "Uvicorn",
  "PostgreSQL",
  "SQLite",
  "OpenAI API",
  "Google GenAI",
  "dkimpy",
  "dnspython",
  "Docker",
  "JWT",
  "pytest",
];

export default function TechStack() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Stack"
          tone="accent-2"
          title={
            <>
              Powered by <span className="text-gradient-blue">modern tooling</span>
            </>
          }
        />
      </div>

      {/* Marquee */}
      <div className="group relative mt-14 flex overflow-hidden">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 sm:w-40"
          style={{
            background:
              "linear-gradient(to right, var(--background), transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 sm:w-40"
          style={{
            background:
              "linear-gradient(to left, var(--background), transparent)",
          }}
        />

        <div className="animate-marquee flex shrink-0 gap-4 pr-4 group-hover:[animation-play-state:paused]">
          {[...technologies, ...technologies].map((tech, i) => (
            <span
              key={i}
              aria-hidden={i >= technologies.length}
              className="panel whitespace-nowrap px-6 py-3.5 font-mono text-[13px] text-muted-foreground transition-colors duration-300 hover:border-accent-2/50 hover:text-accent-2"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
