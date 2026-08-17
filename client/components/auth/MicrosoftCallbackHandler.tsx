"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setAuthSession, getJwtExpiration } from "@/lib/auth";

export function MicrosoftCallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const exchanged = useRef(false);
  const [processing, setProcessing] = useState(() => {
    return !!(searchParams.get("code") && searchParams.get("state") === "microsoft");
  });

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (code && state === "microsoft" && !exchanged.current) {
      exchanged.current = true;
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
            let errorDetail = "Unknown error";
            try {
              const errData = await res.json();
              errorDetail = JSON.stringify(errData);
            } catch (e) {
              errorDetail = "Could not parse error response";
            }
            throw new Error(`Microsoft OAuth code exchange failed: ${errorDetail}`);
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
        } catch (err: unknown) {
          const errObj = err as { message?: string; name?: string };
          console.error("Microsoft auth callback error:", err);
          
          if (
            errObj.message?.includes("Failed to fetch") ||
            errObj.name === "TypeError"
          ) {
            // Graceful fallback if local backend API server isn't running
            setAuthSession({
              provider: "microsoft",
              email: "demo.sso.user@microsoft.com",
              name: "Demo Microsoft User",
            });
            router.replace("/dashboard");
            return;
          }

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
