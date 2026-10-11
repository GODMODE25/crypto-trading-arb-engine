import { d } from "./money.ts";
import type { BookSnapshot, CanonicalSymbol, VenueId } from "./types.ts";

function book(
  venue: VenueId,
  symbol: CanonicalSymbol,
  bids: [string, string][],
  asks: [string, string][],
  tsMs: number,
): BookSnapshot {
  return {
    venue,
    symbol,
    tsMs,
    source: "fixture",
    bids: bids.map(([p, q]) => ({ price: d(p), qty: d(q) })),
    asks: asks.map(([p, q]) => ({ price: d(p), qty: d(q) })),
  };
}

export type FixtureCase =
  | "fee_negative"
  | "valid_paper"
  | "insufficient_depth"
  | "stale"
  | "risk_limit"
  | "triangle_fee_negative";

export interface FixturePack {
  id: FixtureCase;
  title: string;
  explanation: string;
  nowMs: number;
  buy?: BookSnapshot;
  sell?: BookSnapshot;
  books?: {
    btcUsdt: BookSnapshot;
    ethUsdt: BookSnapshot;
    ethBtc: BookSnapshot;
  };
}

/** Six canonical research cases used by the demo suite. */
export function buildFixturePacks(nowMs = 1_700_000_000_000): FixturePack[] {
  const fresh = nowMs - 200;
  const stale = nowMs - 30_000;

  const feeNegative: FixturePack = {
    id: "fee_negative",
    title: "Looks profitable on mid, negative after fees",
    explanation:
      "Binance ask 100.00, Bybit bid 100.12 — a 12 bp raw spread. Two 10 bp taker fees plus the buffer consume the edge.",
    nowMs,
    buy: book("binance", "BTC/USDT", [["99.90", "2"]], [["100.00", "2"]], fresh),
    sell: book("bybit", "BTC/USDT", [["100.12", "2"]], [["100.20", "2"]], fresh),
  };

  const valid: FixturePack = {
    id: "valid_paper",
    title: "Valid inventory spread after fees",
    explanation:
      "Buy 50000 ask on Binance, sell 51200 bid on Bybit. After 10 bp each side and $0.50 buffer the net is still positive.",
    nowMs,
    buy: book(
      "binance",
      "BTC/USDT",
      [["49900", "1"]],
      [
        ["50000", "0.5"],
        ["50010", "1"],
      ],
      fresh,
    ),
    sell: book(
      "bybit",
      "BTC/USDT",
      [
        ["51200", "0.5"],
        ["51100", "1"],
      ],
      [["51300", "1"]],
      fresh,
    ),
  };

  const thin: FixturePack = {
    id: "insufficient_depth",
    title: "Insufficient depth",
    explanation: "Top of book looks wide but size is 0.0001 BTC — cannot fill the proposed quantity.",
    nowMs,
    buy: book("binance", "ETH/USDT", [["3000", "10"]], [["3001", "0.0001"]], fresh),
    sell: book("bybit", "ETH/USDT", [["3100", "0.0001"]], [["3110", "10"]], fresh),
  };

  const stalePack: FixturePack = {
    id: "stale",
    title: "Stale book rejection",
    explanation: "Books are 30 seconds old. Executable signals require age ≤ 5s.",
    nowMs,
    buy: book("binance", "SOL/USDT", [["140", "50"]], [["141", "50"]], stale),
    sell: book("bybit", "SOL/USDT", [["150", "50"]], [["151", "50"]], stale),
  };

  const risk: FixturePack = {
    id: "risk_limit",
    title: "Risk-limit rejection",
    explanation: "A 2 BTC clip at ~50k notional exceeds max_order_notional (75 USDT default).",
    nowMs,
    buy: book("binance", "BTC/USDT", [["49900", "5"]], [["50000", "5"]], fresh),
    sell: book("bybit", "BTC/USDT", [["52000", "5"]], [["52100", "5"]], fresh),
  };

  const tri: FixturePack = {
    id: "triangle_fee_negative",
    title: "Triangle dies after three-leg fees",
    explanation:
      "Cross rates look closed-to-arb on mids, but three 10 bp taker fees plus the buffer make the loop negative.",
    nowMs,
    books: {
      btcUsdt: book("binance", "BTC/USDT", [["50000", "5"]], [["50000", "5"]], fresh),
      ethUsdt: book("binance", "ETH/USDT", [["4000", "20"]], [["4000", "20"]], fresh),
      ethBtc: book("binance", "ETH/BTC", [["0.08", "20"]], [["0.08", "20"]], fresh),
    },
  };

  return [feeNegative, valid, thin, stalePack, risk, tri];
}
