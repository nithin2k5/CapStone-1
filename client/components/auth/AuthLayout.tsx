"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import GoogleAuthProvider from "@/components/auth/GoogleAuthProvider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GoogleAuthProvider>
      <div className="relative min-h-screen flex items-center justify-center p-6">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <Link href="/" className="flex items-center justify-center gap-3 mb-8 group">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] group-hover:border-white/15 transition-colors">
            <Shield className="w-6 h-6 text-muted-foreground" />
          </div>
          <span className="font-heading font-bold text-xl tracking-tight text-foreground">
            Secure Email Gateway
          </span>
        </Link>

        <div className="glass-card rounded-3xl p-8 border border-white/[0.08] shadow-2xl">
          {children}
        </div>
      </motion.div>
    </div>
    </GoogleAuthProvider>
  );
}
