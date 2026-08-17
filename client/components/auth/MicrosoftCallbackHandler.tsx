"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setAuthSession, getJwtExpiration } from "@/lib/auth";

export function MicrosoftCallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (code && state === "microsoft" && !processing) {
      setProcessing(true);
      
      const exchangeCode = async () => {
        try {
          const redirectUri = process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI || window.location.origin;
          
          const res = await fetch("http://localhost:8000/api/v1/auth/microsoft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              redirect_uri: redirectUri,
            }),
          });

          if (!res.ok) {
            throw new Error("Microsoft OAuth code exchange failed");
          }

          const data = await res.json();
          setAuthSession({
            provider: "microsoft",
            email: data.user_email || "user@microsoft.com",
            name: data.user_name || "Microsoft User",
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: getJwtExpiration(data.access_token),
          });

          // Redirect to dashboard on success, clearing the URL params
          router.replace("/dashboard");
        } catch (err) {
          console.error("Microsoft auth callback error:", err);
          router.replace("/login?error=microsoft_auth_failed");
        } finally {
          setProcessing(false);
        }
      };

      exchangeCode();
    }
  }, [searchParams, router, processing]);

  if (processing) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center gap-4 shadow-2xl">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-medium text-sm">Completing Microsoft Sign-in...</p>
        </div>
      </div>
    );
  }

  return null;
}
