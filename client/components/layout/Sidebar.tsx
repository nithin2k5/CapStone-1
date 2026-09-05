"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Shield,
  LayoutDashboard,
  ShieldAlert,
  Mail,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  BarChart3,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { clearAuthSession } from "@/lib/auth";

const navItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Emails", href: "/emails", icon: Mail },
  { name: "Threats", href: "/threats", icon: ShieldAlert },
  { name: "Quarantine", href: "/quarantine", icon: Box },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

const systemItems = [
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = () => {
    clearAuthSession();
    router.push("/login");
  };

  const NavItem = ({ item }: { item: any }) => {
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href));

    return (
      <Link href={item.href}>
        <motion.div
          whileHover={{ x: 4 }}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group",
            isActive
              ? "bg-black/[0.04] dark:bg-white/[0.04] text-black dark:text-foreground border border-indigo-500/30 neon-glow-blue shadow-[0_0_15px_rgba(59,130,246,0.1)]"
              : "text-gray-600 dark:text-muted-foreground hover:text-black dark:hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
          )}
        >
          {isActive && (
            <motion.div 
              layoutId="active-indicator"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full"
            />
          )}
          <item.icon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium tracking-wide">{item.name}</span>}
        </motion.div>
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-white/40 dark:bg-black/40 backdrop-blur-3xl border-r border-black/5 dark:border-border z-40 flex flex-col transition-colors duration-300",
        collapsed ? "w-20" : "w-72"
      )}
    >
      <div className="p-6 h-20 flex items-center justify-between border-b border-black/5 dark:border-border">
        <Link href="/" className="flex items-center gap-3 group overflow-hidden">
          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
            <ShieldCheck className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          </div>
          {!collapsed && (
            <span className="font-heading font-bold text-base tracking-widest text-black dark:text-foreground whitespace-nowrap">
              SECURE GATEWAY
            </span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-foreground/5 text-muted-foreground hover:text-black dark:hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="mb-2">
          {!collapsed && <span className="text-xs font-semibold text-muted-foreground dark:text-gray-600 uppercase tracking-wider px-4">Menu</span>}
        </div>
        {navItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}

        <div className="mt-8 mb-2 pt-4 border-t border-black/5 dark:border-border">
          {!collapsed && <span className="text-xs font-semibold text-muted-foreground dark:text-gray-600 uppercase tracking-wider px-4">System</span>}
        </div>
        {systemItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>

      <div className="p-4 border-t border-black/5 dark:border-border space-y-4">
        {!collapsed && (
          <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Gateway Protected</span>
          </div>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-black dark:hover:text-foreground hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition-all"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
