export function utcNow(): string {
  return new Date().toISOString().replace("T", " ").replace("Z", " UTC");
}

export function fmtTs(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.replace("T", " ").slice(0, 19) + " UTC";
  return d.toISOString().replace("T", " ").replace("Z", " UTC");
}

export function fmtPct(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return (n * 100).toFixed(3) + "%";
}

export function pnlTone(raw: string): "gain" | "loss" | "muted" {
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return "muted";
  return n > 0 ? "gain" : "loss";
}

export function statusTone(status: string): "ok" | "warn" | "loss" | "neutral" {
  const s = status.toLowerCase();
  if (s === "accepted" || s === "filled" || s === "ok") return "ok";
  if (s === "blocked" || s === "partially_filled") return "warn";
  if (s === "rejected" || s === "canceled" || s === "error") return "loss";
  return "neutral";
}
