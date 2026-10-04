import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      icon: Icon,
      isLoading,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primary:
        "bg-accent text-accent-contrast border border-transparent hover:bg-accent-hover",
      secondary:
        "bg-transparent text-foreground border border-border hover:bg-secondary",
      ghost:
        "bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
      danger:
        "bg-transparent text-[var(--danger)] border border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]",
    };

    const sizes = {
      sm: "h-9 px-3.5 text-[13px]",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-[15px]",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <svg
            className="h-4 w-4 animate-spin text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : Icon ? (
          <Icon className="h-4 w-4" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
