"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldAlert, Terminal, Activity } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-32 pb-20 overflow-hidden border-b-4 border-border">
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Column: Massive Typography */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex-1 w-full"
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 border-2 border-[#10B981] bg-[#10B981]/10 text-[#10B981] font-bold uppercase tracking-widest text-xs mb-8">
              <span className="w-2 h-2 bg-[#10B981] animate-ping" />
              SYSTEM.STATUS: ARMED
            </div>

            <h1 className="font-heading text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6 text-foreground">
              Secure Email <span className="text-[#10B981]">Gateway</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl font-mono leading-relaxed border-l-4 border-[#3B82F6] pl-4">
              [INITIATING PROTOCOL] AI-powered interception matrix.
              Detecting zero-day payloads, domain spoofing, and semantic phishing algorithms before inbox penetration.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch gap-6 w-full max-w-md">
              <Link href="/signup" className="btn-primary py-5 px-8 flex items-center justify-between group">
                <span>Engage Defenses</span>
                <Terminal className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </Link>
              <Link href="/dashboard" className="btn-secondary py-5 px-8 flex items-center justify-between">
                <span>View Console</span>
                <Activity className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>

          {/* Right Column: Terminal Window UI */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="flex-1 w-full lg:max-w-xl mt-16 lg:mt-0"
          >
            <div className="glass-card w-full h-[500px] flex flex-col font-mono text-sm">
              {/* Terminal Header */}
              <div className="border-b-2 border-border p-4 flex justify-between items-center bg-secondary">
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-[#10B981]" />
                  <div className="w-3 h-3 bg-[#FFD700]" />
                  <div className="w-3 h-3 bg-[#00FF41]" />
                </div>
                <div className="text-muted-foreground tracking-widest text-xs">ROOT@GATEWAY:~</div>
              </div>
              
              {/* Terminal Body */}
              <div className="p-6 flex-1 flex flex-col gap-4 overflow-hidden relative">
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="text-[#00F0FF]">&gt; Intercepting payload stream...</motion.div>
                
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
                  className="text-muted-foreground">Analyzing headers [DKIM/SPF]: <span className="text-[#00FF41]">VERIFIED</span></motion.div>
                
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
                  className="text-muted-foreground">Scanning URLs [Typosquatting]: <span className="text-[#00FF41]">CLEAN</span></motion.div>
                
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}
                  className="text-muted-foreground">Executing Heuristic Attachment Scan...</motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 3.2 }}
                  className="text-[#EF4444] font-bold mt-2 flex items-center gap-2 bg-[#EF4444]/10 p-2 border border-[#EF4444]">
                  <ShieldAlert className="w-4 h-4 animate-pulse" />
                  WARNING: NESTED MACRO EXECUTABLE DETECTED
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.0 }}
                  className="text-[#EF4444] font-bold uppercase">&gt;&gt; Action: Quarantine initiated.</motion.div>

                <div className="absolute bottom-6 left-6 flex items-center gap-2 text-[#00FF41] mt-auto">
                  <span className="animate-pulse">_</span>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
