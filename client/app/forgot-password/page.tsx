"use client";

import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import { AuthInput, AuthButton } from "@/components/auth/AuthForm";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <AuthLayout>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sign in
      </Link>

      {submitted ? (
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-gray-400 mb-6">
            We&apos;ve sent password reset instructions to your email address.
          </p>
          <Link href="/login">
            <AuthButton variant="secondary">Return to Sign In</AuthButton>
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold text-white mb-2">Reset password</h1>
            <p className="text-gray-400">
              Enter your email and we&apos;ll send you reset instructions.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AuthInput
              label="Email Address"
              type="email"
              placeholder="admin@company.com"
              icon={<Mail className="w-5 h-5" />}
              required
            />

            <AuthButton type="submit">Send Reset Link</AuthButton>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
