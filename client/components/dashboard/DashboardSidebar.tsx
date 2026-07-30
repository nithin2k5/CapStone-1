"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Shield,
  LayoutDashboard,
  ShieldAlert,
  Mail,
  Globe,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { clearAuthSession } from "@/lib/auth";

const navItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Threat Feed", href: "/dashboard/threats", icon: ShieldAlert },
  { name: "Email Queue", href: "/dashboard/emails", icon: Mail },
  { name: "Blocked Domains", href: "/dashboard/domains", icon: Globe },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = () => {
    clearAuthSession();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen glass border-r border-white/[0.05] z-40 flex flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group overflow-hidden">
          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          {!collapsed && (
            <span className="font-heading font-bold text-sm tracking-tight text-white whitespace-nowrap">
              Email Gateway
            </span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                  isActive
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.03]"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/[0.05] space-y-1">
        <Link href="/docs">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.03] transition-all">
            <FileText className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Documentation</span>}
          </div>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
