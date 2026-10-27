"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Loader2, Lock, Mail, User } from "lucide-react";
import { loginWithPassword, registerAccount, TokenResponse } from "@/lib/api";
import { getJwtExpiration, setAuthSession } from "@/lib/auth";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import MicrosoftSignInButton from "@/components/auth/MicrosoftSignInButton";
import { AuthButton, AuthDivider, AuthError, AuthInput } from "@/components/auth/AuthForm";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

const PATH: Record<Mode, string> = { login: "/login", signup: "/signup" };

const COPY: Record<Mode, { eyebrow: string; title: string; lead: string }> = {
  login: {
    eyebrow: "sign in",
    title: "Welcome back",
    lead: "Connect your mailbox, or sign in with the email and password you registered.",
  },
  signup: {
    eyebrow: "get started",
    title: "Create your account",
    lead: "Connect Gmail or Outlook to start scanning, or register with email and connect a mailbox later.",
  },
};

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

function useStartSession() {
  const router = useRouter();
  return (data: TokenResponse, email: string, name: string) => {
    setAuthSession({
      provider: "email",
      email: data.user_email || email,
      name: data.user_name || name,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: getJwtExpiration(data.access_token),
    });
    router.push("/dashboard");
  };
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <AuthButton type="submit" disabled={loading} className="group !mt-7">
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          {children}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </>
      )}
    </AuthButton>
  );
}

function LoginForm() {
  const startSession = useStartSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      startSession(await loginWithPassword(email, password), email, "User");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <AuthError message={error} />}
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
            className="text-[12.5px] font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Forgot password?
          </Link>
        }
      />
      <SubmitButton loading={loading}>Sign in</SubmitButton>
    </form>
  );
}

function SignupForm({ onExisting }: { onExisting: () => void }) {
  const startSession = useStartSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exists, setExists] = useState(false);
  const score = strength(password);

  const submit = async (e: React.FormEvent) => {
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

    setLoading(true);
    try {
      await registerAccount(name.trim(), email, password);
      startSession(await loginWithPassword(email, password), email, name.trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create the account";
      setExists(/already registered/i.test(message));
      setError(message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {error &&
        (exists ? (
          <AuthError message="An account with this email already exists." />
        ) : (
          <AuthError message={error} />
        ))}
      {exists && (
        <button
          type="button"
          onClick={onExisting}
          className="-mt-2 text-[13px] font-semibold text-accent hover:text-accent-hover"
        >
          Sign in to it instead →
        </button>
      )}
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
        id="signup-email"
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
          id="new-password"
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
      <SubmitButton loading={loading}>Create account</SubmitButton>
      <p className="text-center text-[12.5px] leading-relaxed text-muted-foreground">
        By creating an account you agree to the{" "}
        <Link href="/privacy" className="text-foreground underline-offset-4 hover:underline">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}

/**
 * Sign in and sign up as one panel with a switch at the top.
 *
 * Switching rewrites the URL with history.pushState instead of navigating, so
 * the panel stays mounted and the outgoing form can animate out before the
 * incoming one arrives — a route change would swap the page at once. Next
 * syncs usePathname with pushState, so the mode follows Back and Forward, and
 * /login and /signup still load directly.
 */
export function AccessPanel() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const mode: Mode = pathname === "/signup" ? "signup" : "login";
  const dir = mode === "signup" ? 1 : -1;
  const copy = COPY[mode];

  const go = (next: Mode) => {
    if (next !== mode) window.history.pushState(null, "", PATH[next]);
  };

  const slide = reduce ? 0 : 20;
  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * slide }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: -d * slide }),
  };
  const transition = { duration: reduce ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Account"
        className="relative mb-8 grid grid-cols-2 rounded-xl border border-border bg-background/70 p-1"
      >
        {(["login", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => go(m)}
            className={cn(
              "relative z-10 h-10 rounded-lg text-[14px] font-semibold transition-colors duration-200",
              mode === m ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {mode === m && (
              <motion.span
                layoutId="access-tab"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 -z-10 rounded-lg border border-border-strong bg-card"
                style={{ boxShadow: "0 0 0 1px var(--accent-subtle), 0 6px 20px -8px var(--accent-solid)" }}
              />
            )}
            {m === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={mode}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
        >
          <div className="mb-7">
            <span className="eyebrow">
              <span className="h-px w-6 bg-accent" />
              {copy.eyebrow}
            </span>
            <h1 className="display mt-3 text-[2rem] text-foreground">{copy.title}</h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{copy.lead}</p>
          </div>

          <div className="space-y-3">
            <GoogleSignInButton label={mode === "login" ? "Continue with Google" : "Sign up with Google"} />
            <MicrosoftSignInButton label={mode === "login" ? "Continue with Microsoft" : "Sign up with Microsoft"} />
          </div>

          <AuthDivider />

          {mode === "login" ? <LoginForm /> : <SignupForm onExisting={() => go("login")} />}

          <p className="mt-8 text-center text-[14px] text-muted-foreground">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => go(mode === "login" ? "signup" : "login")}
              className="font-semibold text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:text-accent-hover hover:decoration-accent"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
