import { d, moneyStr } from "../money.ts";
import { triangleUsdtBtcEthUsdt, triangleUsdtEthBtcUsdt, type TriangleBooks } from "../formulas.ts";
import type { EdgeConfig } from "../config.ts";
import type { Signal, TriangleResult } from "../types.ts";

function toSignal(r: TriangleResult, nowMs: number, dataTs: number): Signal {
  return {
    id: `tri-${r.path}-${nowMs}`,
    strategyId: "triangle",
    status: r.tradable ? "accepted" : "rejected",
    symbol: r.path,
    expectedProfit: r.netProfit,
    expectedRoi: r.netRoi,
    confidence: r.tradable ? "medium" : "low",
    reasons: r.reasons,
    qty: r.startQuote,
    dataTsMs: dataTs,
    mode: "paper",
    details: {
      start: moneyStr(r.startQuote, 8),
      final: moneyStr(r.finalQuote, 8),
      legs: String(r.legs.length),
      explanation: r.tradable
        ? `Three-leg loop ${r.path} clears fees and buffer.`
        : `Rejected: ${r.reasons.join(", ") || "unprofitable after fees"}`,
    },
  };
}

export function evaluateTriangles(books: TriangleBooks, cfg: EdgeConfig, nowMs: number): Signal[] {
  const fee = d(cfg.takerFeeBinance);
  const cFixed = d(cfg.uncertaintyBufferUsdt);
  const minP = d(cfg.minNetProfitUsdt);
  const minR = d(cfg.minNetRoi);
  const start = d(cfg.maxOrderNotional);
  const dataTs = Math.min(books.btcUsdt.tsMs, books.ethUsdt.tsMs, books.ethBtc.tsMs);
  const stale = nowMs - dataTs > cfg.maxStaleMs;
  const a = triangleUsdtBtcEthUsdt(books, start, fee, cFixed, minP, minR);
  const b = triangleUsdtEthBtcUsdt(books, start, fee, cFixed, minP, minR);
  if (stale) {
    a.reasons.push("stale_data");
    a.tradable = false;
    b.reasons.push("stale_data");
    b.tradable = false;
  }
  return [toSignal(a, nowMs, dataTs), toSignal(b, nowMs, dataTs)];
}
