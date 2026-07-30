"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { AuthInput, AuthButton, AuthDivider } from "@/components/auth/AuthForm";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { setAuthSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;

    setAuthSession({
      provider: "email",
      email: email || "admin@company.com",
      name: email?.split("@")[0] ?? "Admin User",
    });
    router.push("/dashboard");
  };

  return (
    <AuthLayout>
      <div className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-bold text-white mb-2">Welcome back</h1>
        <p className="text-gray-400">Sign in to your SOC dashboard</p>
      </div>

      <GoogleSignInButton label="Sign in with Google" />

      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          label="Email Address"
          name="email"
          type="email"
          placeholder="admin@company.com"
          icon={<Mail className="w-5 h-5" />}
          required
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-400">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <AuthInput
            id="password"
            label=""
            name="password"
            type="password"
            placeholder="••••••••"
            icon={<Lock className="w-5 h-5" />}
            required
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-white/20 bg-black text-white focus:ring-white/20"
          />
          <span className="text-sm text-gray-400">Remember me for 30 days</span>
        </label>

        <AuthButton type="submit">
          Sign In
          <ArrowRight className="w-4 h-4" />
        </AuthButton>
      </form>

      <p className="mt-8 text-center text-sm text-gray-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-gray-400 hover:text-white font-medium">
          Create account
        </Link>
      </p>
    </AuthLayout>
  );
}
