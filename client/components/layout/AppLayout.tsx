"use client";

import { usePathname } from "next/navigation";
import { PageContainer } from "./PageContainer";
import { ReactNode } from "react";

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isPublicPage = 
    pathname === "/" || 
    pathname === "/login" || 
    pathname === "/signup" || 
    pathname === "/forgot-password";

  if (isPublicPage) {
    return <main className="min-h-screen bg-black flex flex-col">{children}</main>;
  }

  return <PageContainer>{children}</PageContainer>;
}
