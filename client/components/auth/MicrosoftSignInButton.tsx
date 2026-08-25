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
    
    const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.warn("Microsoft OAuth credentials not found in frontend env, falling back to demo mode.");
      handleDemoMicrosoftSignIn();
      return;
    }

    try {
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile%20User.Read%20offline_access&prompt=select_account&state=microsoft`;
      window.location.href = authUrl;
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
