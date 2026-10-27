"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Lock, Mail, User } from "lucide-react";
import { loginWithPassword, registerAccount } from "@/lib/api";
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

// Mirrors UserRegister on the server, so the form refuses what the API would.
const MIN_PASSWORD = 8;
const MIN_NAME = 2;

const STRENGTH = [
  { label: "too short", color: "var(--danger)" },
  { label: "weak", color: "var(--danger)" },
  { label: "fair", color: "var(--warning)" },
  { label: "good", color: "var(--accent)" },
  { label: "strong", color: "var(--success)" },
];

/** 0 when below the minimum, then one point per character class beyond it. */
function strength(pw: string) {
  if (pw.length < MIN_PASSWORD) return 0;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  return Math.min(4, Math.max(1, classes - (pw.length >= 12 ? 0 : 1)));
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [exists, setExists] = useState(false);

  const score = strength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setExists(false);

    if (name.trim().length < MIN_NAME) {
      setError(`Name must be at least ${MIN_NAME} characters`);
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters`);
      return;
    }

    setIsLoading(true);
    try {
      await registerAccount(name.trim(), email, password);
      const data = await loginWithPassword(email, password);
      setAuthSession({
        provider: "email",
        email: data.user_email || email,
        name: data.user_name || name.trim(),
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: getJwtExpiration(data.access_token),
      });
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create the account";
      setExists(/already registered/i.test(message));
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeading eyebrow="get started" title="Create your account">
        Connect Gmail or Outlook to start scanning, or register with email and connect a
        mailbox later.
      </AuthHeading>

      <div className="space-y-3">
        <GoogleSignInButton label="Sign up with Google" />
        <MicrosoftSignInButton label="Sign up with Microsoft" />
      </div>

      <AuthDivider />

      {error && (
        <AuthError
          message={exists ? "An account with this email already exists. Sign in instead." : error}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          label="Full name"
          id="name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          icon={<User />}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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
        <div>
          <AuthInput
            label="Password"
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder={`At least ${MIN_PASSWORD} characters`}
            icon={<Lock />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {password && (
            <div className="mt-2.5 flex items-center gap-3">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="h-1 flex-1 rounded-full bg-secondary transition-colors duration-300"
                    style={score >= i ? { background: STRENGTH[score].color } : undefined}
                  />
                ))}
              </div>
              <span
                className="w-16 text-right font-mono text-[10.5px] uppercase tracking-wider"
                style={{ color: STRENGTH[score].color }}
              >
                {STRENGTH[score].label}
              </span>
            </div>
          )}
        </div>

        <AuthButton type="submit" disabled={isLoading} className="group !mt-7">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Create account
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </AuthButton>

        <p className="text-center text-[12.5px] leading-relaxed text-muted-foreground">
          By creating an account you agree to the{" "}
          <Link href="/privacy" className="text-foreground underline-offset-4 hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-8 text-center text-[14px] text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent transition-colors hover:text-accent-hover">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
