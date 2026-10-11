import { ZERO, d, isPositive } from "./money.ts";
import { estimateFill } from "./orderbook.ts";
import type {
  BookSnapshot,
  CanonicalSymbol,
  Mode,
  OrderStatus,
  PaperOrderIntent,
  VenueId,
} from "./types.ts";

export interface PaperBalance {
  venue: VenueId;
  asset: string;
  free: ReturnType<typeof d>;
  locked: ReturnType<typeof d>;
}

export interface PaperFill {
  price: ReturnType<typeof d>;
  qty: ReturnType<typeof d>;
  fee: ReturnType<typeof d>;
  feeAsset: string;
  tsMs: number;
}

export interface PaperOrder {
  id: string;
  clientId: string;
  venue: VenueId;
  symbol: CanonicalSymbol;
  side: PaperOrderIntent["side"];
  type: PaperOrderIntent["type"];
  qty: ReturnType<typeof d>;
  filledQty: ReturnType<typeof d>;
  avgPrice: ReturnType<typeof d>;
  status: OrderStatus;
  feePaid: ReturnType<typeof d>;
  rejectReason?: string;
  strategyId: string;
  signalId: string;
  mode: Mode;
  fills: PaperFill[];
  createdTsMs: number;
  updatedTsMs: number;
}

export interface PaperState {
  balances: PaperBalance[];
  orders: PaperOrder[];
  latencyMs: number;
}

function splitSymbol(symbol: CanonicalSymbol): { base: string; quote: string } {
  const [base, quote] = symbol.split("/");
  return { base, quote };
}

function getBal(state: PaperState, venue: VenueId, asset: string): PaperBalance {
  let b = state.balances.find((x) => x.venue === venue && x.asset === asset);
  if (!b) {
    b = { venue, asset, free: ZERO, locked: ZERO };
    state.balances.push(b);
  }
  return b;
}

export function seedPaperInventory(): PaperBalance[] {
  const venues: VenueId[] = ["binance", "bybit"];
  const out: PaperBalance[] = [];
  for (const v of venues) {
    out.push(
      { venue: v, asset: "USDT", free: d("10000"), locked: ZERO },
      { venue: v, asset: "BTC", free: d("0.15"), locked: ZERO },
      { venue: v, asset: "ETH", free: d("2.0"), locked: ZERO },
      { venue: v, asset: "SOL", free: d("20"), locked: ZERO },
    );
  }
  return out;
}

export interface SubmitOpts {
  book: BookSnapshot;
  nowMs: number;
  minQty: ReturnType<typeof d>;
  minNotional: ReturnType<typeof d>;
  allowPartial: boolean;
}

/**
 * Deterministic paper matching against a provided book snapshot.
 * Market orders walk the book. Limit orders fill only at or better than limit.
 */
export function submitPaperOrder(
  state: PaperState,
  intent: PaperOrderIntent,
  opts: SubmitOpts,
): PaperOrder {
  const id = `P-${opts.nowMs}-${intent.clientId}`;
  const { base, quote } = splitSymbol(intent.symbol);
  const order: PaperOrder = {
    id,
    clientId: intent.clientId,
    venue: intent.venue,
    symbol: intent.symbol,
    side: intent.side,
    type: intent.type,
    qty: intent.qty,
    filledQty: ZERO,
    avgPrice: ZERO,
    status: "new",
    feePaid: ZERO,
    strategyId: intent.strategyId,
    signalId: intent.signalId,
    mode: "paper",
    fills: [],
    createdTsMs: opts.nowMs,
    updatedTsMs: opts.nowMs + state.latencyMs,
  };

  if (!isPositive(intent.qty) || intent.qty.lt(opts.minQty)) {
    order.status = "rejected";
    order.rejectReason = "min_qty";
    state.orders.push(order);
    return order;
  }

  let workingQty = intent.qty;
  if (intent.type === "limit" && intent.limitPrice) {
    const top = intent.side === "buy" ? opts.book.asks[0]?.price : opts.book.bids[0]?.price;
    if (!top) {
      order.status = "rejected";
      order.rejectReason = "empty_book";
      state.orders.push(order);
      return order;
    }
    const marketable =
      intent.side === "buy" ? intent.limitPrice.gte(top) : intent.limitPrice.lte(top);
    if (!marketable) {
      order.status = "accepted";
      order.rejectReason = "resting_unfilled";
      state.orders.push(order);
      return order;
    }
  }

  const fill = estimateFill(opts.book, intent.side, workingQty);
  if (!fill.sufficient && !opts.allowPartial) {
    order.status = "rejected";
    order.rejectReason = "insufficient_depth";
    state.orders.push(order);
    return order;
  }
  if (!fill.sufficient && fill.qty.lte(0)) {
    order.status = "rejected";
    order.rejectReason = "insufficient_depth";
    state.orders.push(order);
    return order;
  }

  const fillQty = fill.qty;
  const notional = fillQty.mul(fill.vwap);
  if (notional.lt(opts.minNotional)) {
    order.status = "rejected";
    order.rejectReason = "min_notional";
    state.orders.push(order);
    return order;
  }

  const fee = notional.mul(intent.feeRate);
  const quoteBal = getBal(state, intent.venue, quote);
  const baseBal = getBal(state, intent.venue, base);

  if (intent.side === "buy") {
    const need = notional.add(fee);
    if (quoteBal.free.lt(need)) {
      order.status = "rejected";
      order.rejectReason = "insufficient_balance_quote";
      state.orders.push(order);
      return order;
    }
    quoteBal.free = quoteBal.free.sub(need);
    baseBal.free = baseBal.free.add(fillQty);
  } else {
    if (baseBal.free.lt(fillQty)) {
      order.status = "rejected";
      order.rejectReason = "insufficient_balance_base";
      state.orders.push(order);
      return order;
    }
    baseBal.free = baseBal.free.sub(fillQty);
    quoteBal.free = quoteBal.free.add(notional.sub(fee));
  }

  order.filledQty = fillQty;
  order.avgPrice = fill.vwap;
  order.feePaid = fee;
  order.fills.push({
    price: fill.vwap,
    qty: fillQty,
    fee,
    feeAsset: quote,
    tsMs: order.updatedTsMs,
  });
  order.status = fill.unfilled.gt(0) ? "partially_filled" : "filled";
  state.orders.push(order);
  return order;
}

export function cancelPaperOrder(state: PaperState, id: string, nowMs: number): boolean {
  const o = state.orders.find((x) => x.id === id);
  if (!o) return false;
  if (o.status === "filled" || o.status === "rejected" || o.status === "canceled") return false;
  o.status = "canceled";
  o.updatedTsMs = nowMs;
  return true;
}

export function markToMarket(
  balances: PaperBalance[],
  prices: Record<string, ReturnType<typeof d>>,
): ReturnType<typeof d> {
  let eq = ZERO;
  for (const b of balances) {
    const amt = b.free.add(b.locked);
    if (b.asset === "USDT") {
      eq = eq.add(amt);
      continue;
    }
    const px = prices[`${b.asset}/USDT`];
    if (px) eq = eq.add(amt.mul(px));
  }
  return eq;
}
