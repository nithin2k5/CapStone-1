export default function AnimatedBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden bg-background"
    >
      {/* Hex mesh under an engineering grid, both faded toward the bottom */}
      <div
        className="absolute inset-0 hex-bg"
        style={{
          maskImage:
            "radial-gradient(120% 80% at 50% 0%, #000 20%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(120% 80% at 50% 0%, #000 20%, transparent 75%)",
        }}
      />
      <div
        className="absolute inset-0 grid-bg"
        style={{
          maskImage:
            "radial-gradient(140% 100% at 50% 0%, #000 25%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(140% 100% at 50% 0%, #000 25%, transparent 80%)",
        }}
      />

      {/* Purple aurora: a violet core flanked by magenta */}
      <div
        className="absolute -top-64 left-1/2 h-[620px] w-[min(980px,95vw)] -translate-x-1/2 rounded-full blur-[160px] opacity-[0.14] dark:opacity-[0.3]"
        style={{ background: "var(--accent-solid)" }}
      />
      <div
        className="absolute -top-24 -right-40 h-[420px] w-[min(560px,70vw)] rounded-full blur-[150px] opacity-[0.08] dark:opacity-[0.18]"
        style={{ background: "var(--accent-2)" }}
      />
      <div
        className="absolute top-[40vh] -left-48 h-[380px] w-[min(520px,70vw)] rounded-full blur-[160px] opacity-[0.06] dark:opacity-[0.12]"
        style={{ background: "var(--accent)" }}
      />

      {/* Telemetry sweep */}
      <div
        className="animate-sweep absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--accent-2), var(--accent), transparent)",
          opacity: "var(--scan-opacity)",
          boxShadow: "0 0 12px var(--accent)",
        }}
      />
    </div>
  );
}
