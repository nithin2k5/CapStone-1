"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Sidebar />
      <div className="pl-20 lg:pl-72 flex flex-col min-h-screen transition-all duration-300">
        <Header />
        <main className="flex-1 p-8 max-w-[1600px] w-full mx-auto relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
