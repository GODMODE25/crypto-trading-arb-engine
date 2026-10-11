import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  children,
}: {
  className?: string;
  tone?: "neutral" | "paper" | "live" | "halt" | "ok" | "warn" | "loss";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-2 text-muted border-border",
    paper: "bg-surface-2 text-fg border-border-strong",
    live: "bg-loss/15 text-loss border-loss/40",
    halt: "bg-loss text-fg border-loss",
    ok: "bg-gain/15 text-gain border-gain/30",
    warn: "bg-warn/15 text-warn border-warn/30",
    loss: "bg-loss/15 text-loss border-loss/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
