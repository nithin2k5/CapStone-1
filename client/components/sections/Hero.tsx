"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Mail, Brain, Network, Lock, ArrowRight, ChevronRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-32 pb-20 overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="flex-1 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-gray-400 text-sm font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/40 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white/60" />
              </span>
              Next-Gen SOC Architecture
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </div>

            <h1 className="font-heading text-6xl md:text-8xl font-bold leading-[1.1] tracking-tight mb-8 text-white">
              Secure Email <br className="hidden md:block" />
              Gateway <span className="text-gray-500 font-light">for</span> <br className="hidden md:block" />
              <span className="text-gradient">Phishing Prevention</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-500 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-light">
              An AI-powered secure email gateway that detects phishing attempts,
              malicious URLs, spoofed domains, and dangerous attachments before they reach users.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 bg-white text-black hover:bg-neutral-200 rounded-full font-semibold text-lg transition-all flex items-center justify-center gap-2 group"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 glass hover:bg-white/[0.05] text-white rounded-full font-semibold text-lg transition-all flex items-center justify-center gap-2"
              >
                View Demo
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
            className="flex-1 relative h-[600px] w-full hidden lg:flex items-center justify-center"
          >
            <motion.div
              animate={{ y: [-15, 15, -15] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-20 w-64 h-64 glass-card rounded-full flex items-center justify-center border-white/10"
            >
              <Shield className="w-32 h-32 text-gray-300" />
            </motion.div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white/[0.04] rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] border border-white/[0.06] rounded-full border-dashed" />

            <div className="absolute inset-0 animate-[spin_30s_linear_infinite]">
              {[
                { Icon: Mail, pos: "top-16 left-1/2 -translate-x-1/2" },
                { Icon: Brain, pos: "bottom-16 left-1/2 -translate-x-1/2" },
                { Icon: Network, pos: "top-1/2 left-16 -translate-y-1/2" },
                { Icon: Lock, pos: "top-1/2 right-16 -translate-y-1/2" },
              ].map(({ Icon, pos }, i) => (
                <div
                  key={i}
                  className={`absolute ${pos} w-20 h-20 glass-card rounded-2xl flex items-center justify-center animate-[spin_30s_linear_infinite_reverse] border-white/10`}
                >
                  <Icon className="w-10 h-10 text-gray-400" />
                </div>
              ))}
            </div>

            <motion.div
              animate={{ y: [0, -20, 0], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 5, repeat: Infinity, delay: 1 }}
              className="absolute top-1/4 right-0 glass-card px-5 py-3 rounded-xl flex items-center gap-3 border-white/10"
            >
              <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
              <span className="text-sm text-gray-300 font-medium">Threat Blocked</span>
            </motion.div>

            <motion.div
              animate={{ y: [0, 20, 0], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 6, repeat: Infinity, delay: 2 }}
              className="absolute bottom-1/3 left-0 glass-card px-5 py-3 rounded-xl flex items-center gap-3 border-white/10"
            >
              <div className="w-2 h-2 rounded-full bg-white/40" />
              <span className="text-sm text-gray-300 font-medium">System Secure</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
