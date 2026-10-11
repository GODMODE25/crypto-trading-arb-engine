import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: { key: string; label: string; mono?: boolean; className?: string }[];
  rows: Record<string, string>[];
  empty: string;
}) {
  if (!rows.length) {
    return <p className="py-8 text-sm text-muted">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-[0.12em] text-subtle">
            {columns.map((c) => (
              <th key={c.key} className="px-2 py-2 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? String(i)} className="border-b border-border/80">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "max-w-[280px] truncate px-2 py-2.5 text-fg",
                    c.mono && "font-mono text-xs tabular-nums",
                    c.className,
                  )}
                >
                  {r[c.key] || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BusyBar({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <div className="mb-4 rounded-[var(--radius-md)] border border-border bg-surface-2 px-3 py-2 text-xs text-muted">
      Working: {label}
    </div>
  );
}

export function Callout({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2 text-xs text-muted">{children}</p>
  );
}
