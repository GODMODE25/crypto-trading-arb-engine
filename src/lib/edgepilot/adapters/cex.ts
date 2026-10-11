import type { BookSnapshot, CanonicalSymbol, VenueId } from "../types.ts";
import { VENUE_SYMBOL, fromBinanceDepth, fromBybitDepth } from "./normalize.ts";

const TIMEOUT_MS = 4000;

async function getJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchBinanceBook(symbol: CanonicalSymbol): Promise<BookSnapshot> {
  const s = VENUE_SYMBOL.binance[symbol];
  if (!s) throw new Error(`unsupported ${symbol}`);
  const json = (await getJson(
    `https://api.binance.com/api/v3/depth?symbol=${s}&limit=20`,
  )) as { bids: string[][]; asks: string[][] };
  return fromBinanceDepth(symbol, json, Date.now());
}

export async function fetchBybitBook(symbol: CanonicalSymbol): Promise<BookSnapshot> {
  const s = VENUE_SYMBOL.bybit[symbol];
  if (!s) throw new Error(`unsupported ${symbol}`);
  const json = (await getJson(
    `https://api.bybit.com/v5/market/orderbook?category=spot&symbol=${s}&limit=20`,
  )) as { result?: { b: string[][]; a: string[][]; ts: number }; time?: number };
  if (!json.result) throw new Error("bybit empty");
  return fromBybitDepth(symbol, json.result, json.time ?? Date.now());
}

export async function fetchVenueBook(venue: VenueId, symbol: CanonicalSymbol): Promise<BookSnapshot> {
  if (venue === "binance") return fetchBinanceBook(symbol);
  if (venue === "bybit") return fetchBybitBook(symbol);
  throw new Error(`no cex adapter for ${venue}`);
}

export async function fetchBinanceServerTime(): Promise<number> {
  const json = (await getJson("https://api.binance.com/api/v3/time")) as { serverTime: number };
  return json.serverTime;
}
