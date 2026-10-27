"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { loginWithPassword } from "@/lib/api";
import { getJwtExpiration, setAuthSession } from "@/lib/auth";
import AuthLayout from "@/components/auth/AuthLayout";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import MicrosoftSignInButton from "@/components/auth/MicrosoftSignInButton";
import {
  AuthButton,
  AuthDivider,
  AuthError,
  AuthHeading,
  AuthInput,
} from "@/components/auth/AuthForm";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const data = await loginWithPassword(email, password);
      setAuthSession({
        provider: "email",
        email: data.user_email || email,
        name: data.user_name || "User",
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: getJwtExpiration(data.access_token),
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeading eyebrow="sign in" title="Welcome back">
        Connect your mailbox, or sign in with the email and password you registered.
      </AuthHeading>

      <div className="space-y-3">
        <GoogleSignInButton label="Continue with Google" />
        <MicrosoftSignInButton label="Continue with Microsoft" />
      </div>

      <AuthDivider />

      {error && <AuthError message={error} />}

      <form onSubmit={handleLogin} className="space-y-5">
        <AuthInput
          label="Email"
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          icon={<Mail />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AuthInput
          label="Password"
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          icon={<Lock />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aside={
            <Link
              href="/forgot-password"
              className="text-[12.5px] text-muted-foreground transition-colors hover:text-accent"
            >
              Forgot password?
            </Link>
          }
        />

        <AuthButton type="submit" disabled={isLoading} className="group !mt-7">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </AuthButton>
      </form>

      <p className="mt-8 text-center text-[14px] text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-accent transition-colors hover:text-accent-hover">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
