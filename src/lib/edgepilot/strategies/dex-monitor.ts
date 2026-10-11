import { d, moneyStr } from "../money.ts";
import { compareCexDex } from "../formulas.ts";
import type { DexQuote } from "../types.ts";
import type { Signal } from "../types.ts";
import type { BookSnapshot } from "../types.ts";
import { estimateFill } from "../orderbook.ts";

export function evaluateDexMonitor(opts: {
  cexBook: BookSnapshot;
  dex: DexQuote;
  qty: string;
  nowMs: number;
  buffer: string;
}): Signal {
  const fill = estimateFill(opts.cexBook, "buy", d(opts.qty));
  const cmp = compareCexDex({
    cexExecutableBuy: fill.vwap,
    dexAmountIn: opts.dex.amountIn,
    dexAmountOut: opts.dex.amountOut,
    gasQuote: opts.dex.gasQuote ?? d("0"),
    buffer: d(opts.buffer),
  });
  return {
    id: `dexmon-${opts.nowMs}`,
    strategyId: "dex_monitor",
    status: "rejected",
    symbol: `${opts.cexBook.symbol} vs ${opts.dex.chain}`,
    expectedProfit: cmp.estimatedNet,
    expectedRoi: d("0"),
    confidence: "low",
    reasons: ["monitoring_only", "dex_execution_disabled"],
    dataTsMs: Math.min(opts.cexBook.tsMs, opts.dex.tsMs),
    mode: "paper",
    details: {
      cexVwap: moneyStr(fill.vwap, 8),
      dexOut: moneyStr(opts.dex.amountOut, 8),
      dexIn: moneyStr(opts.dex.amountIn, 8),
      impactBps: moneyStr(opts.dex.priceImpactBps, 4),
      gasQuote: opts.dex.gasQuote ? moneyStr(opts.dex.gasQuote, 8) : "",
      route: opts.dex.route,
      discrepancyBps: moneyStr(cmp.discrepancyBps, 4),
      chain: opts.dex.chain,
      tokenIn: opts.dex.tokenIn,
      tokenOut: opts.dex.tokenOut,
      quoteTs: String(opts.dex.tsMs),
      label: "MONITORING ONLY — not executable",
      explanation:
        "CEX executable buy vs DEX estimated output. Research only. No swap, no approval, no wallet.",
    },
  };
}
