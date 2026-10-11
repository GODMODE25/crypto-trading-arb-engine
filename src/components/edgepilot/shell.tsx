import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Gauge,
  LayoutDashboard,
  LineChart,
  ListOrdered,
  Power,
  Settings2,
  Shield,
  Wallet,
} from "lucide-react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DashboardDto } from "@/lib/edgepilot/dashboard-dto.ts";
import { utcNow } from "./format.ts";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/strategies", label: "Strategies", icon: BookOpen },
  { to: "/opportunities", label: "Signals", icon: Activity },
  { to: "/paper", label: "Paper book", icon: Wallet },
  { to: "/live", label: "Live book", icon: Shield },
  { to: "/orders", label: "Orders", icon: ListOrdered },
  { to: "/pnl", label: "PnL", icon: LineChart },
  { to: "/risk", label: "Risk & logs", icon: AlertTriangle },
  { to: "/config", label: "Config", icon: Settings2 },
  { to: "/health", label: "Health", icon: Gauge },
  { to: "/emergency", label: "Emergency", icon: Power },
] as const;

export function Shell({
  children,
  dash,
}: {
  children: ReactNode;
  dash: DashboardDto | null;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isPending } = useCurrentUserState();
  const [clock, setClock] = useState("UTC");
  useEffect(() => {
    const tick = () => setClock(utcNow());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const mode = dash?.mode ?? "PAPER";
  const kill = dash?.killSwitch ?? false;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-foreground"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3 md:px-6">
          <Link to="/" className="flex items-baseline gap-2 no-underline">
            <span className="font-sans text-lg font-semibold tracking-tight text-fg">EdgePilot</span>
            <span className="hidden text-[11px] uppercase tracking-[0.18em] text-subtle sm:inline">
              research desk
            </span>
          </Link>
          <Badge tone={kill ? "halt" : mode === "LIVE ENABLED" ? "live" : "paper"}>
            {kill ? "Kill switch on" : mode}
          </Badge>
          <span className="ml-auto hidden font-mono text-xs text-muted tabular-nums md:inline">{clock}</span>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {isPending ? (
              <div className="size-8 animate-pulse rounded-full bg-surface-2" />
            ) : user ? (
              <UserButton />
            ) : null}
          </div>
        </div>
        <p className="border-t border-border px-4 py-1.5 text-[11px] text-subtle md:px-6">
          Simulated paper results are not real performance. No strategy guarantees profit. UTC clocks.
        </p>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        <nav
          className="sticky top-[92px] hidden h-[calc(100dvh-92px)] w-[220px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border p-3 md:flex"
          aria-label="Desk"
        >
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-[var(--radius-sm)] px-3 text-sm no-underline transition-colors duration-[var(--motion-quick)]",
                  active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface hover:text-fg",
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main id="main" className="min-w-0 flex-1 px-4 py-5 pb-24 md:px-8 md:pb-8">
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-border bg-bg md:hidden"
        aria-label="Mobile"
      >
        {NAV.slice(0, 5).map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-w-[72px] flex-1 flex-col items-center gap-1 px-2 py-2 text-[10px] no-underline",
                active ? "text-fg" : "text-muted",
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
        <Link
          to="/emergency"
          className="flex min-w-[72px] flex-1 flex-col items-center gap-1 px-2 py-2 text-[10px] text-loss no-underline"
        >
          <Power className="size-5" />
          Stop
        </Link>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  kicker,
  actions,
}: {
  title: string;
  kicker?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker ? (
          <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-subtle">{kicker}</p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      </div>
      {actions}
    </div>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-xl)] border border-border bg-surface p-4 md:p-5",
        className,
      )}
    >
      {title ? (
        <h2 className="mb-3 text-sm font-medium tracking-tight text-muted">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "gain" | "loss" | "muted";
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-bg p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-subtle">{label}</div>
      <div
        className={cn(
          "mt-2 font-mono text-xl tabular-nums md:text-2xl",
          tone === "gain" && "text-gain",
          tone === "loss" && "text-loss",
          !tone && "text-fg",
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}
