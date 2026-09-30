"use client";

import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import { AuthInput, AuthButton, AuthError } from "@/components/auth/AuthForm";
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
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sign in
      </Link>

      {submitted ? (
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Check your email</h1>
          {/* The API answers the same way whether or not the address is
              registered, so this cannot promise a message was sent. */}
          <p className="text-muted-foreground mb-6">
            If <span className="text-foreground">{email}</span> has an account, reset
            instructions are on their way. The link expires in 30 minutes and can be
            used once.
          </p>
          <Link href="/login">
            <AuthButton variant="secondary">Return to Sign In</AuthButton>
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Reset password</h1>
            <p className="text-muted-foreground">
              Enter your email and we&apos;ll send you reset instructions.
            </p>
          </div>

          {error && <AuthError message={error} />}

          <form onSubmit={handleSubmit} className="space-y-5">
            <AuthInput
              label="Email Address"
              type="email"
              placeholder="admin@company.com"
              icon={<Mail className="w-5 h-5" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <AuthButton type="submit" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Reset Link"}
            </AuthButton>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
