"use client";

import { Search, Bell, Shield, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const isSecure = true; // Replace with actual global state later

  // Generate breadcrumbs from pathname
  const pathParts = pathname.split("/").filter(Boolean);
  const title = pathParts.length > 0 
    ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1)
    : "Overview";

  return (
    <header className="h-20 border-b border-white/5 bg-black/40 backdrop-blur-3xl sticky top-0 z-30 px-8 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-heading font-bold text-white tracking-wide">
          {title}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500 font-medium tracking-wider">SECURE GATEWAY</span>
          <span className="text-gray-700 text-xs">/</span>
          <span className="text-xs text-indigo-400 font-medium tracking-wider uppercase">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group hidden md:block">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder="Search emails, threats..."
            className="w-64 h-10 bg-white/5 border border-white/10 rounded-full pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all"
          />
        </div>

        <div className="flex items-center gap-4 border-l border-white/10 pl-6">
          <button className="relative p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
          </button>

          {isSecure ? (
            <Badge variant="safe" className="hidden sm:flex gap-1.5 px-3 py-1">
              <Shield className="w-3 h-3" />
              SYSTEM SECURE
            </Badge>
          ) : (
            <Badge variant="blocked" className="hidden sm:flex gap-1.5 px-3 py-1">
              <AlertTriangle className="w-3 h-3" />
              THREAT DETECTED
            </Badge>
          )}

          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[1px]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <span className="text-xs font-bold text-white">AD</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
