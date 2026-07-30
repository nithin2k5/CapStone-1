"use client";

import { motion } from "framer-motion";
import { Shield, Mail, Brain, Network, Lock, AlertTriangle, ArrowRight, ChevronRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-32 pb-20 overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="flex-1 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-gray-300 text-sm font-medium mb-8 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Introducing Next-Gen SOC Architecture
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </div>
            
            <h1 className="font-heading text-6xl md:text-8xl font-bold leading-[1.1] tracking-tight mb-8 text-white">
              Secure Email <br className="hidden md:block" />
              Gateway <span className="text-gray-500 font-light">for</span> <br className="hidden md:block" />
              <span className="text-gradient-blue">Phishing Prevention</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-light">
              An AI-powered secure email gateway that detects phishing attempts, 
              malicious URLs, spoofed domains, and dangerous attachments before they reach users.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5">
              <button className="w-full sm:w-auto px-8 py-4 bg-white text-black hover:bg-gray-200 rounded-full font-semibold text-lg transition-all flex items-center justify-center gap-2 group">
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="w-full sm:w-auto px-8 py-4 glass hover:bg-white/[0.05] text-white rounded-full font-semibold text-lg transition-all flex items-center justify-center gap-2">
                View Documentation
              </button>
            </div>
          </motion.div>

          {/* Right Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
            className="flex-1 relative h-[600px] w-full hidden lg:flex items-center justify-center"
          >
            {/* Central Core */}
            <motion.div 
              animate={{ y: [-15, 15, -15] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-20 w-64 h-64 glass-card rounded-full flex items-center justify-center border-blue-500/20 shadow-[0_0_80px_rgba(59,130,246,0.15)] backdrop-blur-3xl"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />
              <Shield className="w-32 h-32 text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
            </motion.div>

            {/* Orbiting Rings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white/[0.03] rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] border border-white/[0.05] rounded-full border-dashed" />

            {/* Orbiting Elements */}
            <div className="absolute inset-0 animate-[spin_30s_linear_infinite]">
              <div className="absolute top-16 left-1/2 -translate-x-1/2 w-20 h-20 glass-card rounded-2xl flex items-center justify-center animate-[spin_30s_linear_infinite_reverse] border-white/10">
                <Mail className="w-10 h-10 text-gray-300" />
              </div>
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-20 h-20 glass-card rounded-2xl flex items-center justify-center animate-[spin_30s_linear_infinite_reverse] border-purple-500/20">
                <Brain className="w-10 h-10 text-purple-400" />
              </div>
              <div className="absolute top-1/2 left-16 -translate-y-1/2 w-20 h-20 glass-card rounded-2xl flex items-center justify-center animate-[spin_30s_linear_infinite_reverse] border-green-500/20">
                <Network className="w-10 h-10 text-green-400" />
              </div>
              <div className="absolute top-1/2 right-16 -translate-y-1/2 w-20 h-20 glass-card rounded-2xl flex items-center justify-center animate-[spin_30s_linear_infinite_reverse] border-blue-500/20">
                <Lock className="w-10 h-10 text-blue-400" />
              </div>
            </div>

            {/* Floating Alerts */}
            <motion.div 
              animate={{ y: [0, -20, 0], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 5, repeat: Infinity, delay: 1 }}
              className="absolute top-1/4 right-0 glass-card px-5 py-3 rounded-xl flex items-center gap-3 border-red-500/20 backdrop-blur-xl"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-gray-200 font-medium">Malware Blocked</span>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 20, 0], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 6, repeat: Infinity, delay: 2 }}
              className="absolute bottom-1/3 left-0 glass-card px-5 py-3 rounded-xl flex items-center gap-3 border-green-500/20 backdrop-blur-xl"
            >
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-gray-200 font-medium">Network Secure</span>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}
