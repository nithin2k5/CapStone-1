export default function AnimatedBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[-1] overflow-hidden bg-background pointer-events-none"
    >
      {/* Faint dot field, masked so it fades out below the fold */}
      <div
        className="absolute inset-0 grid-bg opacity-[0.55]"
        style={{
          maskImage:
            "radial-gradient(130% 80% at 50% 0%, #000 20%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(130% 80% at 50% 0%, #000 20%, transparent 75%)",
        }}
      />

      {/* Single soft accent wash behind the hero */}
      <div
        className="absolute -top-40 left-1/2 h-[420px] w-[min(1100px,120vw)] -translate-x-1/2 rounded-full blur-[130px] opacity-[0.10] dark:opacity-[0.16]"
        style={{ background: "var(--accent)" }}
      />
    </div>
  );
}
