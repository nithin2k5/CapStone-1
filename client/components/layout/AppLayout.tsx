"use client";

import { usePathname } from "next/navigation";
import { PageContainer } from "./PageContainer";
import { ReactNode } from "react";
import { SessionExtendModal } from "@/components/auth/SessionExtendModal";

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isPublicPage = 
    pathname === "/" || 
    pathname === "/login" || 
    pathname === "/signup" || 
    pathname === "/forgot-password";

  if (isPublicPage) {
    return <main className="min-h-screen bg-background flex flex-col">{children}</main>;
  }

  return (
    <PageContainer>
      {children}
      <SessionExtendModal />
    </PageContainer>
  );
}
