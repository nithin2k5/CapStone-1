export default function AnimatedBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden bg-background"
    >
      {/* Engineering grid, faded out toward the bottom of the viewport */}
      <div
        className="absolute inset-0 grid-bg"
        style={{
          maskImage:
            "radial-gradient(140% 100% at 50% 0%, #000 25%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(140% 100% at 50% 0%, #000 25%, transparent 80%)",
        }}
      />

      {/* Two accent washes, one per accent, placed so they never overlap muddily */}
      <div
        className="absolute -top-52 left-[12%] h-[520px] w-[min(760px,85vw)] rounded-full blur-[150px] opacity-[0.12] dark:opacity-[0.22]"
        style={{ background: "var(--accent)" }}
      />
      <div
        className="absolute -top-32 right-[8%] h-[420px] w-[min(620px,70vw)] rounded-full blur-[150px] opacity-[0.08] dark:opacity-[0.16]"
        style={{ background: "var(--accent-2)" }}
      />

      {/* Telemetry sweep */}
      <div
        className="animate-sweep absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--accent-2), transparent)",
          opacity: "var(--scan-opacity)",
        }}
      />
    </div>
  );
}
