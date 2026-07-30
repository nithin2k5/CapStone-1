"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { Loader2 } from "lucide-react";
import { AuthButton, AuthError } from "@/components/auth/AuthForm";
import { isGoogleAuthConfigured } from "@/components/auth/GoogleAuthProvider";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import { decodeGoogleCredential, setAuthSession } from "@/lib/auth";

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

  const handleGoogleSuccess = (response: CredentialResponse) => {
    setLoading(false);
    setError("");

    if (!response.credential) {
      setError("Google sign-in failed. Please try again.");
      return;
    }

    finishSignIn(decodeGoogleCredential(response.credential));
  };

  const handleGoogleError = () => {
    setLoading(false);
    setError("Google sign-in was cancelled or failed.");
  };

  const handleDemoGoogleSignIn = () => {
    setLoading(true);
    setError("");

    window.setTimeout(() => {
      finishSignIn({
        provider: "google",
        email: "demo.user@gmail.com",
        name: "Demo Google User",
        picture: undefined,
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
        <p className="mt-3 text-xs text-center text-gray-500">
          Demo mode — add{" "}
          <code className="text-gray-400">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> for live Google OAuth
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && <AuthError message={error} />}
      <div
        className="w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors [&>div]:!w-full [&>div>div]:!w-full flex justify-center py-0.5"
        onClick={() => setLoading(true)}
      >
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          theme="filled_black"
          size="large"
          text="continue_with"
          shape="rectangular"
          width="400"
          logo_alignment="left"
        />
      </div>
      {loading && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Signing in with Google...
        </div>
      )}
    </div>
  );
}
