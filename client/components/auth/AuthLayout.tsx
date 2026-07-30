"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import AnimatedBackground from "@/components/ui/AnimatedBackground";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <Link href="/" className="flex items-center justify-center gap-3 mb-8 group">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/50 transition-colors">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <span className="font-heading font-bold text-xl tracking-tight text-white">
            Secure Email Gateway
          </span>
        </Link>

        <div className="glass-card rounded-3xl p-8 border border-white/[0.08] shadow-2xl">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
