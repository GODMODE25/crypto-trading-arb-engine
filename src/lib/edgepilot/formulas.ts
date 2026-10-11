import { ZERO, d, floorToStep, isPositive, minD } from "./money.ts";
import { estimateFill } from "./orderbook.ts";
import type {
  BookSnapshot,
  CanonicalSymbol,
  Side,
  SpreadResult,
  TriangleLeg,
  TriangleResult,
  VenueId,
} from "./types.ts";

export interface SpreadInput {
  buyBook: BookSnapshot;
  sellBook: BookSnapshot;
  qty: ReturnType<typeof d>;
  fBuy: ReturnType<typeof d>;
  fSell: ReturnType<typeof d>;
  cFixed: ReturnType<typeof d>;
  minNetProfit: ReturnType<typeof d>;
  minNetRoi: ReturnType<typeof d>;
  maxSlippageBps: ReturnType<typeof d>;
}

/**
 * Inventory-based CEX–CEX spread.
 * NetProfit = Q*P_sell*(1-f_sell) - Q*P_buy*(1+f_buy) - C_fixed
 */
export function inventorySpread(input: SpreadInput): SpreadResult {
  const reasons: string[] = [];
  const buyFill = estimateFill(input.buyBook, "buy", input.qty);
  const sellFill = estimateFill(input.sellBook, "sell", input.qty);
  if (!buyFill.sufficient) reasons.push("insufficient_depth_buy");
  if (!sellFill.sufficient) reasons.push("insufficient_depth_sell");
  if (buyFill.slippageBps.gt(input.maxSlippageBps)) reasons.push("slippage_buy");
  if (sellFill.slippageBps.gt(input.maxSlippageBps)) reasons.push("slippage_sell");

  const Q = input.qty;
  const P_buy = buyFill.vwap;
  const P_sell = sellFill.vwap;
  const grossCost = Q.mul(P_buy);
  const buyFee = grossCost.mul(input.fBuy);
  const grossProceeds = Q.mul(P_sell);
  const sellFee = grossProceeds.mul(input.fSell);
  const netProfit = grossProceeds.sub(sellFee).sub(grossCost).sub(buyFee).sub(input.cFixed);
  const denom = grossCost.add(buyFee).add(input.cFixed);
  const netRoi = denom.gt(0) ? netProfit.div(denom) : ZERO;

  if (P_sell.lte(P_buy)) reasons.push("sell_not_above_buy");
  if (netProfit.lt(input.minNetProfit)) reasons.push("net_profit_below_threshold");
  if (netRoi.lt(input.minNetRoi)) reasons.push("net_roi_below_threshold");
  if (!isPositive(Q) || !buyFill.sufficient || !sellFill.sufficient) reasons.push("invalid_qty");

  const tradable = reasons.length === 0 && netProfit.gte(input.minNetProfit) && netRoi.gte(input.minNetRoi);

  return {
    buyVenue: input.buyBook.venue,
    sellVenue: input.sellBook.venue,
    symbol: input.buyBook.symbol,
    qty: Q,
    pBuy: P_buy,
    pSell: P_sell,
    fBuy: input.fBuy,
    fSell: input.fSell,
    cFixed: input.cFixed,
    grossCost,
    buyFee,
    grossProceeds,
    sellFee,
    netProfit,
    netRoi,
    buySlippageBps: buyFill.slippageBps,
    sellSlippageBps: sellFill.slippageBps,
    reasons,
    tradable,
  };
}

export function maxQtyForNotional(
  notionalCap: ReturnType<typeof d>,
  price: ReturnType<typeof d>,
): ReturnType<typeof d> {
  if (!price.gt(0)) return ZERO;
  return notionalCap.div(price);
}

export function sizeSpreadQty(opts: {
  want: ReturnType<typeof d>;
  buyBook: BookSnapshot;
  sellBook: BookSnapshot;
  maxOrderNotional: ReturnType<typeof d>;
  maxSlippageBps: ReturnType<typeof d>;
  minQty: ReturnType<typeof d>;
  step: ReturnType<typeof d>;
}): ReturnType<typeof d> {
  const topAsk = opts.buyBook.asks[0]?.price;
  if (!topAsk) return ZERO;
  const cap = maxQtyForNotional(opts.maxOrderNotional, topAsk);
  let q = minD(opts.want, cap);
  // shrink until slippage ok or min
  for (let i = 0; i < 12; i++) {
    const buy = estimateFill(opts.buyBook, "buy", q);
    const sell = estimateFill(opts.sellBook, "sell", q);
    if (
      buy.sufficient &&
      sell.sufficient &&
      buy.slippageBps.lte(opts.maxSlippageBps) &&
      sell.slippageBps.lte(opts.maxSlippageBps)
    ) {
      break;
    }
    q = q.mul(d("0.5"));
    if (q.lt(opts.minQty)) return ZERO;
  }
  if (opts.step.gt(0)) {
    q = floorToStep(q, opts.step);
  }
  return q.gte(opts.minQty) ? q : ZERO;
}

export interface TriangleBooks {
  btcUsdt: BookSnapshot;
  ethUsdt: BookSnapshot;
  ethBtc: BookSnapshot;
}

function applyFeeOut(amount: ReturnType<typeof d>, fee: ReturnType<typeof d>) {
  return amount.mul(d("1").sub(fee));
}

function tradePair(
  book: BookSnapshot,
  side: Side,
  qtyBase: ReturnType<typeof d>,
  fee: ReturnType<typeof d>,
  symbol: CanonicalSymbol,
): TriangleLeg | { error: string } {
  const fill = estimateFill(book, side, qtyBase);
  if (!fill.sufficient) return { error: `insufficient_depth_${symbol}_${side}` };
  if (side === "buy") {
    const spentQuote = fill.notional;
    const feeAmt = spentQuote.mul(fee);
    return {
      symbol,
      side,
      qtyBase: fill.qty,
      vwap: fill.vwap,
      fee: feeAmt,
      quoteDelta: spentQuote.add(feeAmt).neg(),
      baseDelta: fill.qty,
    };
  }
  const proceeds = applyFeeOut(fill.notional, fee);
  const feeAmt = fill.notional.mul(fee);
  return {
    symbol,
    side,
    qtyBase: fill.qty,
    vwap: fill.vwap,
    fee: feeAmt,
    quoteDelta: proceeds,
    baseDelta: fill.qty.neg(),
  };
}

/**
 * Path USDT → BTC → ETH → USDT
 * 1. buy BTC/USDT  2. buy ETH/BTC (spend BTC)  3. sell ETH/USDT
 */
export function triangleUsdtBtcEthUsdt(
  books: TriangleBooks,
  startUsdt: ReturnType<typeof d>,
  fee: ReturnType<typeof d>,
  cFixed: ReturnType<typeof d>,
  minNetProfit: ReturnType<typeof d>,
  minNetRoi: ReturnType<typeof d>,
): TriangleResult {
  const reasons: string[] = [];
  const path = "USDT→BTC→ETH→USDT";
  const askBtc = books.btcUsdt.asks[0]?.price;
  if (!askBtc || !askBtc.gt(0)) {
    return emptyTriangle(path, startUsdt, ["missing_btc_usdt_ask"], cFixed);
  }
  const btcQty = startUsdt.div(askBtc);
  const leg1 = tradePair(books.btcUsdt, "buy", btcQty, fee, "BTC/USDT");
  if ("error" in leg1) return emptyTriangle(path, startUsdt, [leg1.error], cFixed);
  const spent1 = leg1.quoteDelta.abs();
  const btcGot = applyFeeOnBuyBase(leg1.qtyBase, fee);

  const askEthBtc = books.ethBtc.asks[0]?.price;
  if (!askEthBtc || !askEthBtc.gt(0)) {
    return emptyTriangle(path, startUsdt, ["missing_eth_btc_ask"], cFixed);
  }
  const ethQty = btcGot.div(askEthBtc);
  const leg2 = tradePair(books.ethBtc, "buy", ethQty, fee, "ETH/BTC");
  if ("error" in leg2) return emptyTriangle(path, startUsdt, [leg2.error], cFixed);
  const ethGot = applyFeeOnBuyBase(leg2.qtyBase, fee);

  const leg3 = tradePair(books.ethUsdt, "sell", ethGot, fee, "ETH/USDT");
  if ("error" in leg3) return emptyTriangle(path, startUsdt, [leg3.error], cFixed);

  const finalQuote = leg3.quoteDelta;
  return finalizeTriangle(path, startUsdt, finalQuote, [leg1, leg2, leg3], cFixed, minNetProfit, minNetRoi, reasons, spent1);
}

/**
 * Path USDT → ETH → BTC → USDT
 * 1. buy ETH/USDT  2. sell ETH/BTC  3. sell BTC/USDT
 */
export function triangleUsdtEthBtcUsdt(
  books: TriangleBooks,
  startUsdt: ReturnType<typeof d>,
  fee: ReturnType<typeof d>,
  cFixed: ReturnType<typeof d>,
  minNetProfit: ReturnType<typeof d>,
  minNetRoi: ReturnType<typeof d>,
): TriangleResult {
  const reasons: string[] = [];
  const path = "USDT→ETH→BTC→USDT";
  const askEth = books.ethUsdt.asks[0]?.price;
  if (!askEth || !askEth.gt(0)) {
    return emptyTriangle(path, startUsdt, ["missing_eth_usdt_ask"], cFixed);
  }
  const ethQty = startUsdt.div(askEth);
  const leg1 = tradePair(books.ethUsdt, "buy", ethQty, fee, "ETH/USDT");
  if ("error" in leg1) return emptyTriangle(path, startUsdt, [leg1.error], cFixed);
  const ethGot = applyFeeOnBuyBase(leg1.qtyBase, fee);

  const leg2 = tradePair(books.ethBtc, "sell", ethGot, fee, "ETH/BTC");
  if ("error" in leg2) return emptyTriangle(path, startUsdt, [leg2.error], cFixed);
  const btcGot = applyFeeOut(leg2.qtyBase.mul(leg2.vwap), fee);

  const leg3 = tradePair(books.btcUsdt, "sell", btcGot, fee, "BTC/USDT");
  if ("error" in leg3) return emptyTriangle(path, startUsdt, [leg3.error], cFixed);

  return finalizeTriangle(path, startUsdt, leg3.quoteDelta, [leg1, leg2, leg3], cFixed, minNetProfit, minNetRoi, reasons, startUsdt);
}

function applyFeeOnBuyBase(base: ReturnType<typeof d>, fee: ReturnType<typeof d>) {
  // taker fee charged in quote; base received is fill qty (Binance usually deducts fee in the quote or BNB).
  // Conservative: haircut base by the fee rate so we never overstate downstream size.
  return base.mul(d("1").sub(fee));
}

function emptyTriangle(
  path: string,
  start: ReturnType<typeof d>,
  reasons: string[],
  cFixed: ReturnType<typeof d>,
): TriangleResult {
  return {
    path,
    startQuote: start,
    finalQuote: ZERO,
    netProfit: start.neg().sub(cFixed),
    netRoi: d("-1"),
    legs: [],
    reasons,
    tradable: false,
  };
}

function finalizeTriangle(
  path: string,
  start: ReturnType<typeof d>,
  finalQuote: ReturnType<typeof d>,
  legs: TriangleLeg[],
  cFixed: ReturnType<typeof d>,
  minNetProfit: ReturnType<typeof d>,
  minNetRoi: ReturnType<typeof d>,
  extra: string[],
  _spent: ReturnType<typeof d>,
): TriangleResult {
  const reasons = [...extra];
  const netProfit = finalQuote.sub(start).sub(cFixed);
  const netRoi = start.gt(0) ? netProfit.div(start) : ZERO;
  if (netProfit.lt(minNetProfit)) reasons.push("net_profit_below_threshold");
  if (netRoi.lt(minNetRoi)) reasons.push("net_roi_below_threshold");
  if (legs.length !== 3) reasons.push("incomplete_legs");
  return {
    path,
    startQuote: start,
    finalQuote,
    netProfit,
    netRoi,
    legs,
    reasons,
    tradable: reasons.length === 0,
  };
}

export function compareCexDex(opts: {
  cexExecutableBuy: ReturnType<typeof d>;
  dexAmountIn: ReturnType<typeof d>;
  dexAmountOut: ReturnType<typeof d>;
  gasQuote: ReturnType<typeof d>;
  buffer: ReturnType<typeof d>;
}): { discrepancyBps: ReturnType<typeof d>; estimatedNet: ReturnType<typeof d>; monitoringOnly: true } {
  const dexPx = opts.dexAmountIn.gt(0) ? opts.dexAmountOut.div(opts.dexAmountIn) : ZERO;
  const discrepancyBps =
    opts.cexExecutableBuy.gt(0) && dexPx.gt(0)
      ? dexPx.sub(opts.cexExecutableBuy).abs().div(opts.cexExecutableBuy).mul(d("10000"))
      : ZERO;
  const estimatedNet = opts.dexAmountOut.sub(opts.dexAmountIn.mul(opts.cexExecutableBuy)).sub(opts.gasQuote).sub(opts.buffer);
  return { discrepancyBps, estimatedNet, monitoringOnly: true };
}

export type { VenueId };
