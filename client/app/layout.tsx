import type { Metadata } from "next";
import { Syne, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

import { AppLayout } from "@/components/layout/AppLayout";
import { MicrosoftCallbackHandler } from "@/components/auth/MicrosoftCallbackHandler";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Secure Email Gateway | Phishing Prevention",
  description: "An AI-powered secure email gateway that detects phishing attempts, malicious URLs, spoofed domains, and dangerous attachments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-[#e0e0e0] font-mono overflow-x-hidden selection:bg-[#FF3366] selection:text-white">
        <Suspense fallback={null}>
          <MicrosoftCallbackHandler />
        </Suspense>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
