import { d } from "../money.ts";
import type { BookSnapshot, CanonicalSymbol, VenueId } from "../types.ts";

export const VENUE_SYMBOL: Record<VenueId, Record<string, string>> = {
  binance: {
    "BTC/USDT": "BTCUSDT",
    "ETH/USDT": "ETHUSDT",
    "SOL/USDT": "SOLUSDT",
    "ETH/BTC": "ETHBTC",
  },
  bybit: {
    "BTC/USDT": "BTCUSDT",
    "ETH/USDT": "ETHUSDT",
    "SOL/USDT": "SOLUSDT",
    "ETH/BTC": "ETHBTC",
  },
  dex: {},
};

export function canonicalFromVenue(venue: VenueId, raw: string): CanonicalSymbol | null {
  const map = VENUE_SYMBOL[venue];
  for (const [canon, v] of Object.entries(map)) {
    if (v === raw || v === raw.replace("-", "")) return canon as CanonicalSymbol;
  }
  return null;
}

export function fromBinanceDepth(
  symbol: CanonicalSymbol,
  json: { bids: string[][]; asks: string[][]; lastUpdateId?: number },
  tsMs: number,
): BookSnapshot {
  return {
    venue: "binance",
    symbol,
    tsMs,
    source: "rest",
    bids: (json.bids ?? []).slice(0, 20).map(([p, q]) => ({ price: d(p), qty: d(q) })),
    asks: (json.asks ?? []).slice(0, 20).map(([p, q]) => ({ price: d(p), qty: d(q) })),
  };
}

export function fromBybitDepth(
  symbol: CanonicalSymbol,
  json: { b?: string[][]; a?: string[][]; ts?: number },
  fallbackTs: number,
): BookSnapshot {
  return {
    venue: "bybit",
    symbol,
    tsMs: json.ts ?? fallbackTs,
    source: "rest",
    bids: (json.b ?? []).slice(0, 20).map(([p, q]) => ({ price: d(p), qty: d(q) })),
    asks: (json.a ?? []).slice(0, 20).map(([p, q]) => ({ price: d(p), qty: d(q) })),
  };
}
