import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
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
      className={`${spaceGrotesk.variable} ${inter.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white font-sans overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
        <Suspense fallback={null}>
          <MicrosoftCallbackHandler />
        </Suspense>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
