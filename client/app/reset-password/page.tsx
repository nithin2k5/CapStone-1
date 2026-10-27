"use client";

import Link from "next/link";
import { Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";
import { AuthInput, AuthButton, AuthError, AuthHeading, AuthNotice } from "@/components/auth/AuthForm";
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
        <AuthHeading eyebrow="account recovery" title="Link incomplete">
          This address carries no reset token. Open the link from the email exactly
          as it was sent, or request a new one.
        </AuthHeading>
        <Link href="/forgot-password">
          <AuthButton variant="secondary">Request a new link</AuthButton>
        </Link>
      </>
    );
  }

  if (done) {
    return (
      <>
        <AuthNotice icon={<CheckCircle2 />} title="Password updated">
          The link is now spent. Taking you to sign in.
        </AuthNotice>
        <Link href="/login" className="mt-8 block">
          <AuthButton variant="secondary">Go to sign in</AuthButton>
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthHeading eyebrow="account recovery" title="Choose a new password">
        At least {MIN_LENGTH} characters. This link works once.
      </AuthHeading>

      {error && <AuthError message={error} />}

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          label="New password"
          id="new-password"
          type="password"
          placeholder="••••••••"
          icon={<Lock />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <AuthInput
          label="Confirm password"
          id="confirm-password"
          type="password"
          placeholder="••••••••"
          icon={<Lock />}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />

        <AuthButton type="submit" disabled={isLoading}>
          {isLoading ? "Updating…" : "Update password"}
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
        className="mb-8 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
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
