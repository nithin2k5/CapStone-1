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
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-400 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            "w-full bg-black/40 border border-white/10 rounded-xl py-3 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all",
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
          "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]",
        variant === "secondary" &&
          "bg-white/5 hover:bg-white/10 text-white border border-white/10",
        variant === "ghost" && "text-gray-400 hover:text-white bg-transparent",
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
        <div className="w-full border-t border-white/10" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-gray-900/80 px-3 text-gray-500">or continue with</span>
      </div>
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
      {message}
    </div>
  );
}
