"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Mail, Lock, User, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAuthSession } from "@/lib/auth";
import GoogleAuthProvider from "@/components/auth/GoogleAuthProvider";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import MicrosoftSignInButton from "@/components/auth/MicrosoftSignInButton";
import { AuthDivider } from "@/components/auth/AuthForm";

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const form = new FormData(e.currentTarget);
    const firstName = form.get("firstName") as string;
    const lastName = form.get("lastName") as string;
    const email = form.get("email") as string;

    setTimeout(() => {
      setAuthSession({
        provider: "email",
        email: email || "user@company.com",
        name: `${firstName} ${lastName}`.trim() || "New User",
      });
      router.push("/dashboard");
    }, 1000);
  };

  return (
    <GoogleAuthProvider>
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
                Join thousands of organizations securing their email infrastructure with AI-powered protection.
              </p>
            </motion.div>
          </div>

          {/* Right column (Signup Form) */}
          <div className="flex-1 p-8 md:p-16 lg:p-16 flex flex-col justify-center overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="max-w-md w-full mx-auto my-8">
              
              <h2 className="text-2xl font-heading font-semibold text-white mb-8 text-center md:text-left">
                Create account
              </h2>

              <div className="space-y-3">
                <GoogleSignInButton label="Sign up with Google" />
                <MicrosoftSignInButton label="Sign up with Microsoft" />
              </div>
              
              <AuthDivider />

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400 ml-1 uppercase tracking-wider">First Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input 
                        name="firstName"
                        type="text" 
                        required
                        placeholder="John" 
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400 ml-1 uppercase tracking-wider">Last Name</label>
                    <input 
                      name="lastName"
                      type="text" 
                      required
                      placeholder="Doe" 
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400 ml-1 uppercase tracking-wider">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input 
                      name="email"
                      type="email" 
                      required
                      placeholder="john@company.com" 
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400 ml-1 uppercase tracking-wider">Organization</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input 
                      name="organization"
                      type="text" 
                      required
                      placeholder="Acme Corp" 
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400 ml-1 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input 
                      name="password"
                      type="password" 
                      required
                      placeholder="••••••••••••" 
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 mt-0.5 rounded border-white/20 bg-black text-white focus:ring-white/20"
                    required
                  />
                  <span className="text-sm text-gray-400 leading-relaxed">
                    I agree to the{" "}
                    <Link href="/privacy" className="text-gray-400 hover:text-white">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-gray-400 hover:text-white">
                      Privacy Policy
                    </Link>
                  </span>
                </label>

                <div className="pt-2">
                  <Button className="w-full h-12 text-base flex items-center justify-center gap-2" isLoading={isLoading}>
                    Create Account
                    {!isLoading && <ArrowRight className="w-4 h-4" />}
                  </Button>
                </div>
              </form>

              <div className="mt-8 flex items-center justify-center">
                <p className="text-sm text-gray-400">
                  Already have an account?{" "}
                  <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
              
            </motion.div>
          </div>

        </div>
      </div>
    </GoogleAuthProvider>
  );
}
