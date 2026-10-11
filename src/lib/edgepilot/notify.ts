import { redactText } from "./money.ts";

export interface Alert {
  type: string;
  message: string;
  tsMs: number;
  dedupKey: string;
}

const lastSent = new Map<string, number>();
const COOLDOWN_MS = 5 * 60 * 1000;

export function shouldSend(dedupKey: string, nowMs: number, cooldown = COOLDOWN_MS): boolean {
  const prev = lastSent.get(dedupKey) ?? 0;
  if (nowMs - prev < cooldown) return false;
  lastSent.set(dedupKey, nowMs);
  return true;
}

export async function sendTelegram(opts: {
  token?: string;
  chatId?: string;
  text: string;
}): Promise<"skipped" | "sent" | "error"> {
  if (!opts.token || !opts.chatId) return "skipped";
  try {
    const url = `https://api.telegram.org/bot${opts.token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: opts.chatId, text: redactText(opts.text) }),
    });
    return res.ok ? "sent" : "error";
  } catch {
    return "error";
  }
}

export const ALERT_TYPES = [
  "startup",
  "shutdown",
  "feed_disconnect",
  "stale_data",
  "risk_limit",
  "kill_switch",
  "live_blocked",
  "live_order",
  "live_fill",
  "daily_pnl",
  "unhandled",
] as const;
