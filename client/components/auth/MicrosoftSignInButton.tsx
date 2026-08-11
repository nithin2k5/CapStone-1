"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthButton, AuthError } from "@/components/auth/AuthForm";
import { MicrosoftIcon } from "@/components/ui/MicrosoftIcon";
import { setAuthSession } from "@/lib/auth";

type MicrosoftSignInButtonProps = {
  label?: string;
};

export default function MicrosoftSignInButton({
  label = "Continue with Microsoft",
}: MicrosoftSignInButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const finishSignIn = (session: Parameters<typeof setAuthSession>[0]) => {
    setAuthSession(session);
    router.push("/dashboard");
  };

  const handleDemoMicrosoftSignIn = () => {
    setLoading(true);
    setError("");

    window.setTimeout(() => {
      finishSignIn({
        provider: "microsoft",
        email: "demo.user@microsoft.com",
        name: "Demo Microsoft User",
      });
    }, 600);
  };

  const login = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/microsoft/login");
      if (!res.ok) {
        throw new Error("Failed to get Microsoft login URL");
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        handleDemoMicrosoftSignIn();
      }
    } catch (err) {
      console.error(err);
      handleDemoMicrosoftSignIn();
    }
  };

  return (
    <div>
      {error && <AuthError message={error} />}
      <AuthButton
        type="button"
        variant="secondary"
        onClick={login}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <MicrosoftIcon className="w-5 h-5" />
        )}
        {label}
      </AuthButton>
      {loading && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Authenticating with Microsoft SSO...
        </div>
      )}
    </div>
  );
}
