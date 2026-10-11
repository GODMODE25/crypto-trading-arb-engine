import { BPS, ZERO, d, isPositive, moneyStr } from "./money.ts";
import type { BookLevel, BookSnapshot, FillEstimate, Side } from "./types.ts";

export function sortBook(book: BookSnapshot): BookSnapshot {
  const bids = [...book.bids].sort((a, b) => b.price.cmp(a.price));
  const asks = [...book.asks].sort((a, b) => a.price.cmp(b.price));
  return { ...book, bids, asks };
}

export function levelsFor(book: BookSnapshot, side: Side): BookLevel[] {
  const sorted = sortBook(book);
  return side === "buy" ? sorted.asks : sorted.bids;
}

/**
 * Walk the book to fill `qty` of base. Buy walks asks; sell walks bids.
 * Rejects if residual remains.
 */
export function estimateFill(book: BookSnapshot, side: Side, qty: ReturnType<typeof d>): FillEstimate {
  const q = qty;
  if (!isPositive(q)) {
    return {
      qty: ZERO,
      vwap: ZERO,
      notional: ZERO,
      unfilled: q.abs(),
      top: ZERO,
      slippageBps: ZERO,
      sufficient: false,
    };
  }
  const levels = levelsFor(book, side);
  const top = levels[0]?.price ?? ZERO;
  let remaining = q;
  let notional = ZERO;
  let filled = ZERO;
  for (const lvl of levels) {
    if (!isPositive(lvl.qty) || !isPositive(lvl.price)) continue;
    const take = remaining.lt(lvl.qty) ? remaining : lvl.qty;
    notional = notional.add(take.mul(lvl.price));
    filled = filled.add(take);
    remaining = remaining.sub(take);
    if (remaining.lte(0)) break;
  }
  const sufficient = remaining.lte(0) && filled.gt(0);
  const vwap = filled.gt(0) ? notional.div(filled) : ZERO;
  const slippageBps =
    top.gt(0) && vwap.gt(0) ? vwap.sub(top).abs().div(top).mul(BPS) : ZERO;
  return {
    qty: filled,
    vwap,
    notional,
    unfilled: remaining.gt(0) ? remaining : ZERO,
    top,
    slippageBps,
    sufficient,
  };
}

export function bookAgeMs(book: BookSnapshot, nowMs: number): number {
  return nowMs - book.tsMs;
}

export function serializeBook(book: BookSnapshot): {
  venue: string;
  symbol: string;
  tsMs: number;
  source: string;
  bids: { price: string; qty: string }[];
  asks: { price: string; qty: string }[];
} {
  return {
    venue: book.venue,
    symbol: book.symbol,
    tsMs: book.tsMs,
    source: book.source,
    bids: book.bids.slice(0, 20).map((l) => ({ price: moneyStr(l.price), qty: moneyStr(l.qty) })),
    asks: book.asks.slice(0, 20).map((l) => ({ price: moneyStr(l.price), qty: moneyStr(l.qty) })),
  };
}

export function parseLevels(rows: { price: string; qty: string }[]): BookLevel[] {
  return rows.map((r) => ({ price: d(r.price), qty: d(r.qty) }));
}
