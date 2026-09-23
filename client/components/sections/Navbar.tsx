"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Terminal, Menu, X, Power } from "lucide-react";
import Link from "next/link";
import { GithubIcon } from "@/components/ui/SocialIcons";
import { ThemeToggle } from "@/components/ThemeToggle";

const navLinks = [
  { name: "Features", href: "/#features" },
  { name: "Architecture", href: "/#architecture" },
  { name: "Research", href: "/#research" },
  { name: "Setup", href: "/#setup" },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border transition-colors duration-300">
      <nav className="w-full flex items-center justify-between px-4 sm:px-6 h-16 font-sans text-sm">
        
        {/* Logo / System ID */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex items-center justify-center w-8 h-8 bg-[#10B981] text-black rounded-md">
            <Terminal className="w-5 h-5" />
          </div>
          <span className="font-heading font-bold text-lg tracking-tight text-foreground">
            Secure.Email<span className="text-[#10B981]">_GW</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="font-bold text-muted-foreground hover:text-[#00F0FF] hover:bg-[#00F0FF]/10 px-2 py-1 transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="https://github.com"
            target="_blank"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <GithubIcon />
          </Link>
          <div className="w-[2px] h-6 bg-border" />
          <Link
            href="/login"
            className="px-4 py-2 font-bold text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black transition-colors border border-transparent hover:border-[#00F0FF]"
          >
            AUTH
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 font-bold bg-[#10B981] text-black hover:bg-foreground hover:text-background transition-colors flex items-center gap-2"
          >
            <Power className="w-4 h-4" />
            INITIATE
          </Link>
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden flex items-center gap-3">
          <ThemeToggle />
          <button
            className="p-2 text-[#10B981]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-16 left-0 right-0 bg-background border-b-2 border-border font-mono shadow-[0_10px_30px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.9)]"
        >
          <div className="flex flex-col p-4 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-lg font-bold text-muted-foreground hover:text-[#00F0FF] hover:bg-[#00F0FF]/10 p-3 transition-colors border-l-2 border-transparent hover:border-[#00F0FF]"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="flex flex-col gap-3 mt-4 pt-4 border-t-2 border-border">
              <Link
                href="/login"
                className="w-full p-3 font-bold text-[#00F0FF] border-2 border-[#00F0FF] text-center uppercase"
                onClick={() => setMobileMenuOpen(false)}
              >
                Authenticate
              </Link>
              <Link
                href="/signup"
                className="w-full p-3 font-bold bg-[#10B981] text-black text-center uppercase flex justify-center items-center gap-2 hover:bg-foreground hover:text-background transition-colors"
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
