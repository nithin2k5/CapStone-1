"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Menu, X } from "lucide-react";
import Link from "next/link";
import { GithubIcon } from "@/components/ui/SocialIcons";

const navLinks = [
  { name: "Features", href: "/#features" },
  { name: "Architecture", href: "/#architecture" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Research", href: "/#research" },
  { name: "Docs", href: "/docs" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4 pointer-events-none">
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className={`pointer-events-auto w-full max-w-[70%] transition-all duration-500 rounded-full ${
          scrolled
            ? "glass shadow-[0_8px_32px_rgba(139,92,246,0.2)] py-3 px-6 border-indigo-500/25"
            : "bg-transparent py-4 px-6"
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/40 group-hover:border-purple-400/80 shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all">
              <Shield className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
            </div>
            <span className="font-heading font-bold text-lg tracking-tight hidden lg:block text-white">
              Gateway <span className="text-purple-400 font-extrabold">.ai</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-gray-400 hover:text-purple-300 transition-colors relative group"
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
              className="p-2.5 text-gray-400 hover:text-purple-300 transition-colors rounded-full hover:bg-purple-500/10"
            >
              <GithubIcon />
            </Link>
            <Link
              href="/login"
              className="px-6 py-2.5 text-sm font-semibold btn-secondary rounded-full"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2.5 text-sm font-semibold btn-primary rounded-full"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-purple-400" /> : <Menu className="w-6 h-6 text-purple-400" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden absolute top-full left-0 right-0 mt-4 glass rounded-3xl overflow-hidden border-indigo-500/30 bg-neutral-950 shadow-2xl"
          >
            <div className="flex flex-col px-6 py-6 gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-lg font-medium text-gray-300 hover:text-purple-400 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex flex-col gap-4 pt-6 border-t border-indigo-500/20">
                <Link
                  href="/signup"
                  className="w-full px-6 py-3 text-base font-semibold btn-primary rounded-xl text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
                <Link
                  href="/login"
                  className="w-full px-6 py-3 text-base font-semibold btn-secondary rounded-xl text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </motion.nav>
    </div>
  );
}
