"use client";

import { Bell, Search, User } from "lucide-react";
import { useAuthSession } from "@/lib/useAuthSession";
import Image from "next/image";

type DashboardHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const session = useAuthSession();

  const displayName = session?.name ?? "Admin User";
  const role =
    session?.provider === "google" ? "Google Account" : "SOC Analyst";

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search threats, emails..."
            className="w-64 bg-black border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-gray-600 focus:outline-none focus:border-border transition-all"
          />
        </div>

        <button className="relative p-2.5 rounded-xl glass hover:bg-white/[0.05] transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-foreground/50 rounded-full animate-pulse" />
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <div className="hidden sm:block text-right">
            <div className="text-sm font-medium text-foreground">{displayName}</div>
            <div className="text-xs text-muted-foreground">{role}</div>
          </div>
          {session?.picture ? (
            <Image
              src={session.picture}
              alt={displayName}
              width={40}
              height={40}
              className="w-10 h-10 rounded-xl border border-border object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
