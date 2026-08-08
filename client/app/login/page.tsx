"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAuthSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setAuthSession("dummy-token");
      router.push("/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-black flex relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Subtle grid background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]" 
        style={{ backgroundImage: "linear-gradient(rgba(255, 255, 255, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 1) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
      />

      <div className="w-full flex flex-col md:flex-row max-w-[1400px] mx-auto relative z-10">
        
        {/* Left column (Branding) */}
        <div className="flex-1 p-8 md:p-16 lg:p-24 flex flex-col justify-center border-r border-white/5 bg-black/40 backdrop-blur-md">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center mb-8 neon-glow-blue">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white leading-tight tracking-wide mb-6">
              SECURE<br />
              EMAIL<br />
              GATEWAY
            </h1>
            
            <p className="text-lg text-gray-400 max-w-md">
              AI-powered email security for modern organizations. Detect threats, mitigate risks, and secure your communications.
            </p>
          </motion.div>
        </div>

        {/* Right column (Login Form) */}
        <div className="flex-1 p-8 md:p-16 lg:p-24 flex flex-col justify-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="max-w-md w-full mx-auto">
            
            <h2 className="text-2xl font-heading font-semibold text-white mb-8 text-center md:text-left">
              Welcome back
            </h2>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400 ml-1 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="email" 
                    required
                    placeholder="admin@your-company.com" 
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400 ml-1 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••••••" 
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button className="w-full h-12 text-base" isLoading={isLoading}>
                  Sign In
                </Button>
              </div>
            </form>

            <div className="mt-8 flex items-center justify-between">
              <button type="button" className="text-sm text-gray-400 hover:text-white transition-colors">
                Forgot password?
              </button>
              
              <Link href="/signup" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                Create Account
              </Link>
            </div>
            
          </motion.div>
        </div>

      </div>
    </div>
  );
}
