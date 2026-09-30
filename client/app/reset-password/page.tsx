"use client";

import Link from "next/link";
import { Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";
import { AuthInput, AuthButton, AuthError } from "@/components/auth/AuthForm";
import { resetPassword } from "@/lib/api";

const MIN_LENGTH = 8;

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("The two passwords do not match");
      return;
    }
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters`);
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <>
        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
          Link incomplete
        </h1>
        <p className="text-muted-foreground mb-6">
          This address carries no reset token. Open the link from the email exactly
          as it was sent, or request a new one.
        </p>
        <Link href="/forgot-password">
          <AuthButton variant="secondary">Request a new link</AuthButton>
        </Link>
      </>
    );
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
          Password updated
        </h1>
        <p className="text-muted-foreground mb-6">
          The link is now spent. Taking you to sign in.
        </p>
        <Link href="/login">
          <AuthButton variant="secondary">Go to Sign In</AuthButton>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
          Choose a new password
        </h1>
        <p className="text-muted-foreground">
          At least {MIN_LENGTH} characters. This link works once.
        </p>
      </div>

      {error && <AuthError message={error} />}

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          label="New Password"
          id="new-password"
          type="password"
          placeholder="••••••••"
          icon={<Lock className="w-5 h-5" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <AuthInput
          label="Confirm Password"
          id="confirm-password"
          type="password"
          placeholder="••••••••"
          icon={<Lock className="w-5 h-5" />}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />

        <AuthButton type="submit" disabled={isLoading}>
          {isLoading ? "Updating..." : "Update Password"}
        </AuthButton>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sign in
      </Link>

      <Suspense
        fallback={<p className="text-muted-foreground">Loading…</p>}
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
