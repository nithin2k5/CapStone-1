"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession, setAuthSession, clearAuthSession, getJwtExpiration } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

const EXPIRATION_WARNING_MINUTES = 5;

export function SessionExtendModal() {
  const [showModal, setShowModal] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = () => {
      const session = getAuthSession();
      if (!session || !session.expiresAt) return;

      const timeRemaining = session.expiresAt - Date.now();
      const warningThreshold = EXPIRATION_WARNING_MINUTES * 60 * 1000;

      if (timeRemaining <= 0) {
        // Session expired
        clearAuthSession();
        router.push("/login");
      } else if (timeRemaining <= warningThreshold) {
        setShowModal(true);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkSession, 30 * 1000);
    // Initial check
    checkSession();

    return () => clearInterval(interval);
  }, [router]);

  const handleExtend = async () => {
    setIsExtending(true);
    const session = getAuthSession();
    if (!session || !session.refreshToken) {
      handleLogout();
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      });

      if (!res.ok) throw new Error("Failed to refresh token");

      const data = await res.json();
      setAuthSession({
        ...session,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: getJwtExpiration(data.access_token),
      });
      
      setShowModal(false);
    } catch (err) {
      console.error("Session extension failed", err);
      handleLogout();
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogout = () => {
    setShowModal(false);
    clearAuthSession();
    router.push("/login");
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-semibold text-foreground mb-2">Session Expiring Soon</h3>
        <p className="text-slate-300 mb-6">
          Your security session will expire in less than {EXPIRATION_WARNING_MINUTES} minutes due to inactivity. Do you want to extend your session?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleLogout} disabled={isExtending}>
            Log Out
          </Button>
          <Button onClick={handleExtend} isLoading={isExtending}>
            Extend Session
          </Button>
        </div>
      </div>
    </div>
  );
}
