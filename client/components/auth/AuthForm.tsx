"use client";

import { useState } from "react";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: React.ReactNode;
  /** Rendered at the right end of the label row, e.g. a "Forgot?" link. */
  aside?: React.ReactNode;
};

export function AuthInput({ label, icon, aside, className, id, type, ...props }: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : "input");
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label
          htmlFor={inputId}
          className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
        >
          {label}
        </label>
        {aside}
      </div>
      <div className="group relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent [&_svg]:h-[18px] [&_svg]:w-[18px]">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          type={isPassword && revealed ? "text" : type}
          className={cn(
            "h-12 w-full rounded-xl border border-border bg-background/60 text-[15px] text-foreground transition-all",
            "placeholder:text-muted-foreground/50 focus:border-accent/60 focus:bg-background focus:outline-none focus:ring-4 focus:ring-accent/15",
            icon ? "pl-11" : "pl-4",
            isPassword ? "pr-12" : "pr-4",
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function AuthButton({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2.5 rounded-xl text-[15px] font-semibold transition-all disabled:pointer-events-none disabled:opacity-60",
        variant === "primary" && "btn-primary",
        variant === "secondary" &&
          "border border-border bg-card text-foreground hover:border-border-strong hover:bg-secondary",
        variant === "ghost" && "bg-transparent text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function AuthDivider({ label = "or with email" }: { label?: string }) {
  return (
    <div className="my-7 flex items-center gap-4">
      <span className="h-px flex-1 bg-border" />
      <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13.5px] leading-relaxed"
      style={{
        color: "var(--danger)",
        borderColor: "color-mix(in srgb, var(--danger) 30%, var(--border))",
        background: "color-mix(in srgb, var(--danger) 8%, transparent)",
      }}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function AuthHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <span className="eyebrow">
        <span className="h-px w-6 bg-accent" />
        {eyebrow}
      </span>
      <h1 className="display mt-3 text-[2rem] text-foreground">{title}</h1>
      {children && (
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{children}</p>
      )}
    </div>
  );
}

/** A centred confirmation used once a flow has finished. */
export function AuthNotice({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-2 text-center">
      <div className="chip mx-auto mb-6 h-16 w-16 rounded-2xl [&_svg]:h-7 [&_svg]:w-7">{icon}</div>
      <h1 className="display text-[1.6rem] text-foreground">{title}</h1>
      <div className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}
