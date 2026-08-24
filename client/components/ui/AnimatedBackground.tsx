"use client";

import { motion } from "framer-motion";

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#050505] pointer-events-none scanlines">
      {/* Brutalist Moving Grid */}
      <motion.div
        animate={{ y: [0, 40] }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="absolute -top-10 -left-10 -right-10 bottom-0 grid-bg opacity-[0.4]"
      />
      
      {/* Harsh vignette overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_95%)]" />
      
      {/* Glitching Alert Block */}
      <motion.div
        animate={{ opacity: [0, 0, 0.1, 0, 0.05, 0], x: [-10, 10, -5, 5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/4 right-1/4 w-[300px] h-[30px] bg-[#B026FF] mix-blend-overlay"
      />

      {/* Sweeping Cyber Line */}
      <motion.div
        animate={{ y: ["-100vh", "100vh"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 w-full h-[2px] bg-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.8)] opacity-30"
      />
    </div>
  );
}
