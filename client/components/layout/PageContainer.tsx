"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import AnimatedBackground from "@/components/ui/AnimatedBackground";

export function PageContainer({ children }: { children: ReactNode }) {
  // Collapse is a desktop choice; the drawer is how small screens reach the nav.
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-background text-foreground font-sans">
      <AnimatedBackground />
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        drawerOpen={drawerOpen}
        onCloseDrawer={() => setDrawerOpen(false)}
      />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-300",
          collapsed ? "lg:pl-[84px]" : "lg:pl-[264px]"
        )}
      >
        <Header onOpenDrawer={() => setDrawerOpen(true)} />
        <main className="relative z-10 mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
