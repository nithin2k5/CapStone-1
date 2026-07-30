"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Building2, ArrowRight } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { AuthInput, AuthButton, AuthDivider } from "@/components/auth/AuthForm";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { setAuthSession } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const firstName = form.get("firstName") as string;
    const lastName = form.get("lastName") as string;
    const email = form.get("email") as string;

    setAuthSession({
      provider: "email",
      email: email || "user@company.com",
      name: `${firstName} ${lastName}`.trim() || "New User",
    });
    router.push("/dashboard");
  };

  return (
    <AuthLayout>
      <div className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-bold text-white mb-2">Create account</h1>
        <p className="text-gray-400">Start protecting your organization today</p>
      </div>

      <GoogleSignInButton label="Sign up with Google" />

      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <AuthInput
            label="First Name"
            name="firstName"
            type="text"
            placeholder="John"
            icon={<User className="w-5 h-5" />}
            required
          />
          <AuthInput
            label="Last Name"
            name="lastName"
            type="text"
            placeholder="Doe"
            required
          />
        </div>

        <AuthInput
          label="Work Email"
          name="email"
          type="email"
          placeholder="john@company.com"
          icon={<Mail className="w-5 h-5" />}
          required
        />

        <AuthInput
          label="Organization"
          name="organization"
          type="text"
          placeholder="Acme Corp"
          icon={<Building2 className="w-5 h-5" />}
          required
        />

        <AuthInput
          label="Password"
          name="password"
          type="password"
          placeholder="Min. 8 characters"
          icon={<Lock className="w-5 h-5" />}
          required
        />

        <label className="flex items-start gap-3 cursor-pointer pt-2">
          <input
            type="checkbox"
            className="w-4 h-4 mt-0.5 rounded border-white/20 bg-black/40 text-blue-600 focus:ring-blue-500/50"
            required
          />
          <span className="text-sm text-gray-400 leading-relaxed">
            I agree to the{" "}
            <Link href="/privacy" className="text-blue-400 hover:text-blue-300">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-blue-400 hover:text-blue-300">
              Privacy Policy
            </Link>
          </span>
        </label>

        <AuthButton type="submit">
          Create Account
          <ArrowRight className="w-4 h-4" />
        </AuthButton>
      </form>

      <p className="mt-8 text-center text-sm text-gray-400">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
