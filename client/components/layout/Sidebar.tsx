"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  ShieldAlert,
  Mail,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  BarChart3,
  Box,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuthSession } from "@/lib/auth";

type NavLink = {
  name: string;
  href: string;
  icon: LucideIcon;
};

const navItems: NavLink[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Emails", href: "/emails", icon: Mail },
  { name: "Threats", href: "/threats", icon: ShieldAlert },
  { name: "Quarantine", href: "/quarantine", icon: Box },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

const systemItems: NavLink[] = [
  { name: "Settings", href: "/settings", icon: Settings },
];

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
};

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  drawerOpen,
  onCloseDrawer,
}: SidebarProps) {
  return (
    <>
      {/* Desktop rail */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-border bg-card/70 backdrop-blur-2xl transition-[width] duration-300 lg:flex",
          collapsed ? "w-[84px]" : "w-[264px]"
        )}
      >
        <SidebarBody
          collapsed={collapsed}
          headerAction={
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent-subtle hover:text-accent"
            >
              {collapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </button>
          }
        />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseDrawer}
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-0 top-0 z-50 flex h-screen w-[264px] flex-col border-r border-border bg-card shadow-[var(--glow-3)] lg:hidden"
            >
              <SidebarBody
                collapsed={false}
                onNavigate={onCloseDrawer}
                headerAction={
                  <button
                    type="button"
                    onClick={onCloseDrawer}
                    aria-label="Close menu"
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                }
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarBody({
  collapsed,
  headerAction,
  onNavigate,
}: {
  collapsed: boolean;
  headerAction: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = () => {
    clearAuthSession();
    router.push("/login");
  };

  const renderItem = (item: NavLink) => {
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href));

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        title={collapsed ? item.name : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
          collapsed && "justify-center px-0",
          isActive
            ? "bg-accent-subtle text-accent"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
      >
        {isActive && (
          <motion.span
            layoutId={`active-indicator-${onNavigate ? "drawer" : "rail"}`}
            className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent"
            style={{ boxShadow: "0 0 12px var(--accent)" }}
          />
        )}
        <item.icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span>{item.name}</span>}
      </Link>
    );
  };

  const sectionLabel = (label: string) =>
    collapsed ? (
      <div className="mx-auto my-3 h-px w-6 bg-border" />
    ) : (
      <div className="px-3 pb-2 pt-4 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
    );

  return (
    <>
      <div
        className={cn(
          "flex h-[68px] shrink-0 items-center border-b border-border px-4",
          collapsed ? "flex-col justify-center gap-1 px-2" : "justify-between"
        )}
      >
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 overflow-hidden"
        >
          <span className="chip glow-accent relative h-9 w-9 shrink-0 overflow-hidden">
            <ShieldCheck className="relative z-10 h-[18px] w-[18px]" />
            <span
              className="animate-radar absolute inset-0 opacity-60"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0 75%, color-mix(in srgb, var(--accent) 45%, transparent))",
              }}
            />
          </span>
          {!collapsed && (
            <span className="display whitespace-nowrap text-[15px] text-foreground">
              Secure<span className="text-accent">.</span>Email
              <span className="text-muted-foreground">_GW</span>
            </span>
          )}
        </Link>
        {!collapsed && headerAction}
      </div>
      {collapsed && (
        <div className="flex justify-center border-b border-border py-2">
          {headerAction}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {sectionLabel("Monitor")}
        <div className="space-y-1">{navItems.map(renderItem)}</div>
        {sectionLabel("System")}
        <div className="space-y-1">{systemItems.map(renderItem)}</div>
      </nav>

      <div className="space-y-2 border-t border-border p-3">
        {!collapsed && (
          <div
            className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
            style={{
              borderColor: "color-mix(in srgb, var(--success) 25%, var(--border))",
              background: "color-mix(in srgb, var(--success) 7%, transparent)",
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-[var(--success)]" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
            </span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--success)]">
              gateway active
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] hover:text-[var(--danger)]",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </>
  );
}
