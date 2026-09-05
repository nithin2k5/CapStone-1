import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: React.ReactNode;
};

export function AuthInput({ label, icon, className, id, ...props }: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : "input");

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-muted-foreground mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            "w-full bg-black border border-white/[0.08] rounded-xl py-3 pr-4 text-foreground placeholder:text-gray-600 focus:outline-none focus:border-border transition-all",
            icon ? "pl-12" : "pl-4",
            className
          )}
          {...props}
        />
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
        "w-full py-3.5 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2",
        variant === "primary" &&
          "bg-white hover:bg-neutral-200 text-black",
        variant === "secondary" &&
          "bg-white/[0.04] hover:bg-white/[0.08] text-foreground border border-white/[0.08]",
        variant === "ghost" && "text-muted-foreground hover:text-foreground bg-transparent",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function AuthDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-gray-900/80 px-3 text-muted-foreground">or continue with</span>
      </div>
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div className="mb-4 p-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-muted-foreground text-sm">
      {message}
    </div>
  );
}
