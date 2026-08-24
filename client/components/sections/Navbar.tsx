"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Terminal, Menu, X, Power } from "lucide-react";
import Link from "next/link";
import { GithubIcon } from "@/components/ui/SocialIcons";

const navLinks = [
  { name: "[ FEATURES ]", href: "/#features" },
  { name: "[ ARCHITECTURE ]", href: "/#architecture" },
  { name: "[ DASHBOARD ]", href: "/dashboard" },
  { name: "[ RESEARCH ]", href: "/#research" },
  { name: "[ DOCS ]", href: "/docs" },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#050505] border-b-2 border-[#333333]">
      <nav className="w-full flex items-center justify-between px-4 sm:px-6 h-16 font-mono text-sm">
        
        {/* Logo / System ID */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex items-center justify-center w-8 h-8 bg-[#10B981] text-[#050505]">
            <Terminal className="w-5 h-5" />
          </div>
          <span className="font-heading font-black text-xl tracking-tighter text-[#e0e0e0] uppercase">
            SECURE.EMAIL<span className="text-[#10B981]">_GW</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="font-bold text-[#888888] hover:text-[#00F0FF] hover:bg-[#00F0FF]/10 px-2 py-1 transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="https://github.com"
            target="_blank"
            className="p-2 text-[#888888] hover:text-[#e0e0e0] transition-colors"
          >
            <GithubIcon />
          </Link>
          <div className="w-[2px] h-6 bg-[#333333]" />
          <Link
            href="/login"
            className="px-4 py-2 font-bold text-[#00F0FF] hover:bg-[#00F0FF] hover:text-[#050505] transition-colors border border-transparent hover:border-[#00F0FF]"
          >
            AUTH
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 font-bold bg-[#10B981] text-[#050505] hover:bg-[#e0e0e0] transition-colors flex items-center gap-2"
          >
            <Power className="w-4 h-4" />
            INITIATE
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 text-[#10B981]"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-16 left-0 right-0 bg-[#050505] border-b-2 border-[#333333] font-mono shadow-[0_10px_30px_rgba(0,0,0,0.9)]"
        >
          <div className="flex flex-col p-4 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-lg font-bold text-[#888888] hover:text-[#00F0FF] hover:bg-[#00F0FF]/10 p-3 transition-colors border-l-2 border-transparent hover:border-[#00F0FF]"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="flex flex-col gap-3 mt-4 pt-4 border-t-2 border-[#333333]">
              <Link
                href="/login"
                className="w-full p-3 font-bold text-[#00F0FF] border-2 border-[#00F0FF] text-center uppercase"
                onClick={() => setMobileMenuOpen(false)}
              >
                Authenticate
              </Link>
              <Link
                href="/signup"
                className="w-full p-3 font-bold bg-[#10B981] text-[#050505] text-center uppercase flex justify-center items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Power className="w-4 h-4" />
                Initiate System
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
