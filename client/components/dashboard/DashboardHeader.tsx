"use client";

import { Bell, Search, User } from "lucide-react";

type DashboardHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-gray-400 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="search"
            placeholder="Search threats, emails..."
            className="w-64 bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>

        <button className="relative p-2.5 rounded-xl glass hover:bg-white/[0.05] transition-colors">
          <Bell className="w-5 h-5 text-gray-400" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-white/10">
          <div className="hidden sm:block text-right">
            <div className="text-sm font-medium text-white">Admin User</div>
            <div className="text-xs text-gray-500">SOC Analyst</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-400" />
          </div>
        </div>
      </div>
    </header>
  );
}
