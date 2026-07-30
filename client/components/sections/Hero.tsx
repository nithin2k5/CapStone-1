"use client";

import { motion } from "framer-motion";
import { Shield, Mail, Brain, Network, Lock, AlertTriangle, ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Next-Gen SOC Architecture
            </div>
            
            <h1 className="font-heading text-5xl md:text-7xl font-bold leading-tight mb-6">
              Secure Email Gateway <br />
              <span className="text-gradient-blue">for Phishing Prevention</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-400 mb-8 leading-relaxed max-w-xl">
              An AI-powered secure email gateway that detects phishing attempts, 
              malicious URLs, spoofed domains, dangerous attachments, and 
              suspicious sender behavior before they reach users.
            </p>
            
            <div className="flex flex-wrap items-center gap-4">
              <button className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all neon-glow-hover flex items-center gap-2 group">
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 glass hover:bg-white/10 text-white rounded-xl font-medium transition-all flex items-center gap-2">
                View Demo
              </button>
            </div>
          </motion.div>

          {/* Right Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative h-[600px] hidden lg:block"
          >
            {/* Central Shield */}
            <motion.div 
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 glass-card rounded-3xl flex items-center justify-center z-20 border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.2)]"
            >
              <Shield className="w-24 h-24 text-blue-500" />
            </motion.div>

            {/* Orbiting Elements */}
            <div className="absolute inset-0 animate-[spin_20s_linear_infinite]">
              {/* Email */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-16 h-16 glass-card rounded-2xl flex items-center justify-center animate-[spin_20s_linear_infinite_reverse]">
                <Mail className="w-8 h-8 text-white" />
              </div>
              {/* AI Brain */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-16 h-16 glass-card rounded-2xl flex items-center justify-center animate-[spin_20s_linear_infinite_reverse]">
                <Brain className="w-8 h-8 text-purple-400" />
              </div>
              {/* Network */}
              <div className="absolute top-1/2 left-10 -translate-y-1/2 w-16 h-16 glass-card rounded-2xl flex items-center justify-center animate-[spin_20s_linear_infinite_reverse]">
                <Network className="w-8 h-8 text-green-400" />
              </div>
              {/* Lock */}
              <div className="absolute top-1/2 right-10 -translate-y-1/2 w-16 h-16 glass-card rounded-2xl flex items-center justify-center animate-[spin_20s_linear_infinite_reverse]">
                <Lock className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            {/* Floating Alerts */}
            <motion.div 
              animate={{ y: [0, -15, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, delay: 1 }}
              className="absolute top-1/4 right-0 glass-card px-4 py-2 rounded-lg flex items-center gap-2 border-red-500/30"
            >
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-100 font-mono">Threat Blocked</span>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 15, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 5, repeat: Infinity, delay: 2 }}
              className="absolute bottom-1/3 left-0 glass-card px-4 py-2 rounded-lg flex items-center gap-2 border-green-500/30"
            >
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-100 font-mono">System Secure</span>
            </motion.div>

            {/* Background Rings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/5 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white/5 rounded-full border-dashed" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
