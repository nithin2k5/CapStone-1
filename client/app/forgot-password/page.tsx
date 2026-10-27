"use client";

import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import { AuthInput, AuthButton, AuthError, AuthHeading, AuthNotice } from "@/components/auth/AuthForm";
import { requestPasswordReset } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Link
        href="/login"
        className="mb-8 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </Link>

      {submitted ? (
        <>
          {/* The API answers the same way whether or not the address is
              registered, so this cannot promise a message was sent. */}
          <AuthNotice icon={<CheckCircle2 />} title="Check your email">
            If <span className="text-foreground">{email}</span> has an account, reset
            instructions are on their way. The link expires in 30 minutes and can be
            used once.
          </AuthNotice>
          <Link href="/login" className="mt-8 block">
            <AuthButton variant="secondary">Return to sign in</AuthButton>
          </Link>
        </>
      ) : (
        <>
          <AuthHeading eyebrow="account recovery" title="Reset your password">
            Enter the email you registered with and we&apos;ll send a one-time reset link.
          </AuthHeading>

          {error && <AuthError message={error} />}

          <form onSubmit={handleSubmit} className="space-y-5">
            <AuthInput
              label="Email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              icon={<Mail />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <AuthButton type="submit" disabled={isLoading}>
              {isLoading ? "Sending…" : "Send reset link"}
            </AuthButton>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
