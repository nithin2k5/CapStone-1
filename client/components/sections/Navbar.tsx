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
          scrolled ? "glass shadow-2xl py-3 px-6" : "bg-transparent py-4 px-6"
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/50 transition-colors">
              <Shield className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
            </div>
            <span className="font-heading font-bold text-lg tracking-tight hidden lg:block text-white">
              Gateway
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-gray-400 hover:text-white transition-colors relative group"
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
              className="p-2.5 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
            >
              <GithubIcon />
            </Link>
            <Link
              href="/login"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-full transition-all backdrop-blur-md"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-full transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden absolute top-full left-0 right-0 mt-4 glass rounded-3xl overflow-hidden"
          >
            <div className="flex flex-col px-6 py-6 gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-lg font-medium text-gray-300 hover:text-white transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex flex-col gap-4 pt-6 border-t border-white/10">
                <Link
                  href="/signup"
                  className="w-full px-6 py-3 text-base font-semibold text-white bg-blue-600 rounded-xl text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
                <Link
                  href="/login"
                  className="w-full px-6 py-3 text-base font-semibold text-white bg-white/5 border border-white/10 rounded-xl text-center"
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
