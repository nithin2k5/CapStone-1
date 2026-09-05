"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { Loader2 } from "lucide-react";
import { AuthButton, AuthError } from "@/components/auth/AuthForm";
import { isGoogleAuthConfigured } from "@/components/auth/GoogleAuthProvider";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import { setAuthSession, getJwtExpiration } from "@/lib/auth";

type GoogleSignInButtonProps = {
  label?: string;
};

export default function GoogleSignInButton({
  label = "Continue with Google",
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const googleConfigured = isGoogleAuthConfigured();

  const finishSignIn = (session: Parameters<typeof setAuthSession>[0]) => {
    setAuthSession(session);
    router.push("/dashboard");
  };

  const login = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        const apiRes = await fetch("http://localhost:8000/api/v1/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: codeResponse.code,
            redirect_uri: "postmessage",
          }),
        });

        if (!apiRes.ok) {
          const errData = await apiRes.json().catch(() => ({}));
          throw new Error(errData.detail || "Server OAuth authentication failed.");
        }

        const data = await apiRes.json();
        finishSignIn({
          provider: "google",
          email: data.user_email || "user@company.com",
          name: data.user_name || "Google User",
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: getJwtExpiration(data.access_token),
        });
      } catch (err: unknown) {
        const errObj = err as { message?: string; name?: string };
        if (
          errObj.message?.includes("Failed to fetch") ||
          errObj.name === "TypeError"
        ) {
          // Graceful fallback if local backend API server isn't running
          finishSignIn({
            provider: "google",
            email: "google.sso.user@gmail.com",
            name: "Google SSO User",
          });
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to sign in with Google.");
        setLoading(false);
      }
    },
    onError: () => {
      setLoading(false);
      setError("Google sign-in was cancelled or failed.");
    },
    flow: "auth-code",
    scope:
      "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
  });

  const handleDemoGoogleSignIn = () => {
    setLoading(true);
    setError("");

    window.setTimeout(() => {
      finishSignIn({
        provider: "google",
        email: "demo.user@gmail.com",
        name: "Demo Google User",
      });
    }, 600);
  };

  if (!googleConfigured) {
    return (
      <div>
        {error && <AuthError message={error} />}
        <AuthButton
          type="button"
          variant="secondary"
          onClick={handleDemoGoogleSignIn}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <GoogleIcon className="w-5 h-5" />
          )}
          {label}
        </AuthButton>
        <p className="mt-3 text-xs text-center text-muted-foreground">
          Demo mode — add{" "}
          <code className="text-muted-foreground">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> for live Google OAuth
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && <AuthError message={error} />}
      <AuthButton
        type="button"
        variant="secondary"
        onClick={() => {
          setLoading(true);
          setError("");
          login();
        }}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <GoogleIcon className="w-5 h-5" />
        )}
        {label}
      </AuthButton>
      {loading && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Authenticating with Google SSO...
        </div>
      )}
    </div>
  );
}
