import { d, moneyStr } from "../money.ts";
import { inventorySpread, sizeSpreadQty } from "../formulas.ts";
import type { EdgeConfig } from "../config.ts";
import type { BookSnapshot, CanonicalSymbol, Signal } from "../types.ts";

export function evaluateSpread(opts: {
  buy: BookSnapshot;
  sell: BookSnapshot;
  cfg: EdgeConfig;
  nowMs: number;
  wantQty?: string;
  skipSize?: boolean;
  forceQty?: string;
}): Signal {
  const symbol = opts.buy.symbol as CanonicalSymbol;
  const fBuy = d(opts.buy.venue === "bybit" ? opts.cfg.takerFeeBybit : opts.cfg.takerFeeBinance);
  const fSell = d(opts.sell.venue === "bybit" ? opts.cfg.takerFeeBybit : opts.cfg.takerFeeBinance);
  const qty = opts.forceQty
    ? d(opts.forceQty)
    : sizeSpreadQty({
        want: d(opts.wantQty ?? "0.01"),
        buyBook: opts.buy,
        sellBook: opts.sell,
        maxOrderNotional: d(opts.cfg.maxOrderNotional),
        maxSlippageBps: d(opts.cfg.maxSlippageBps),
        minQty: d("0.00001"),
        step: d("0.00001"),
      });

  const age = Math.max(opts.nowMs - opts.buy.tsMs, opts.nowMs - opts.sell.tsMs);
  const stale = age > opts.cfg.maxStaleMs;

  const result = inventorySpread({
    buyBook: opts.buy,
    sellBook: opts.sell,
    qty: qty.gt(0) ? qty : d("0.001"),
    fBuy,
    fSell,
    cFixed: d(opts.cfg.uncertaintyBufferUsdt),
    minNetProfit: d(opts.cfg.minNetProfitUsdt),
    minNetRoi: d(opts.cfg.minNetRoi),
    maxSlippageBps: d(opts.cfg.maxSlippageBps),
  });

  const reasons = [...result.reasons];
  if (stale) reasons.push("stale_data");
  if (qty.lte(0) && !opts.forceQty) reasons.push("qty_below_min_after_sizing");

  const tradable = result.tradable && !stale && (qty.gt(0) || Boolean(opts.forceQty));

  return {
    id: `spread-${opts.buy.venue}-${opts.sell.venue}-${symbol}-${opts.nowMs}`,
    strategyId: "spread",
    status: tradable ? "accepted" : "rejected",
    symbol,
    expectedProfit: result.netProfit,
    expectedRoi: result.netRoi,
    confidence: tradable ? "medium" : "low",
    reasons,
    buyVenue: result.buyVenue,
    sellVenue: result.sellVenue,
    qty: result.qty,
    dataTsMs: Math.min(opts.buy.tsMs, opts.sell.tsMs),
    mode: "paper",
    details: {
      pBuy: moneyStr(result.pBuy, 8),
      pSell: moneyStr(result.pSell, 8),
      grossCost: moneyStr(result.grossCost, 8),
      buyFee: moneyStr(result.buyFee, 8),
      sellFee: moneyStr(result.sellFee, 8),
      cFixed: moneyStr(result.cFixed, 8),
      buySlippageBps: moneyStr(result.buySlippageBps, 4),
      sellSlippageBps: moneyStr(result.sellSlippageBps, 4),
      explanation: tradable
        ? `Inventory spread ${opts.buy.venue} buy / ${opts.sell.venue} sell after fees and buffer.`
        : `Rejected: ${reasons.join(", ")}`,
    },
  };
}

export function bothDirections(
  a: BookSnapshot,
  b: BookSnapshot,
  cfg: EdgeConfig,
  nowMs: number,
): Signal[] {
  return [
    evaluateSpread({ buy: a, sell: b, cfg, nowMs }),
    evaluateSpread({ buy: b, sell: a, cfg, nowMs }),
  ];
}
