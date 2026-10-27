"use client";

import { Menu, Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuthSession } from "@/lib/useAuthSession";

const titles: Record<string, string> = {
  dashboard: "Overview",
  emails: "Emails",
  threats: "Threats",
  quarantine: "Quarantine",
  analytics: "Analytics",
  settings: "Settings",
  docs: "Docs",
  privacy: "Privacy",
};

function initials(name: string | undefined, email: string | undefined) {
  const source = (name || email || "").trim();
  if (!source) return "··";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "··";
}

export function Header({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const pathname = usePathname();
  const session = useAuthSession();

  const parts = pathname.split("/").filter(Boolean);
  const section = parts[0] ?? "dashboard";
  const title = titles[section] ?? section.charAt(0).toUpperCase() + section.slice(1);

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between gap-4 border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open menu"
          className="rounded-lg p-2 text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>gateway</span>
            <span className="text-border-strong">/</span>
            <span className="text-accent">{section}</span>
            {parts[1] && (
              <>
                <span className="text-border-strong">/</span>
                <span className="max-w-[120px] truncate">{parts[1]}</span>
              </>
            )}
          </div>
          <h1 className="display mt-0.5 truncate text-[19px] text-foreground">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        <span
          className="pill hidden md:inline-flex"
          style={{
            borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border))",
            background: "var(--accent-subtle)",
            color: "var(--accent)",
          }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-accent" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          monitoring
        </span>

        <ThemeToggle />

        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent"
            style={{ boxShadow: "0 0 8px var(--accent)" }}
          />
        </button>

        <div
          className="ml-1 flex items-center gap-2.5 rounded-xl border border-border bg-card/60 py-1 pl-1 pr-1 sm:pr-3"
          title={session?.email}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold text-accent-contrast"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-solid), var(--accent-2))",
            }}
          >
            {initials(session?.name, session?.email)}
          </span>
          <span className="hidden max-w-[140px] truncate text-[12.5px] font-medium text-foreground sm:block">
            {session?.name || session?.email || "Analyst"}
          </span>
        </div>
      </div>
    </header>
  );
}
