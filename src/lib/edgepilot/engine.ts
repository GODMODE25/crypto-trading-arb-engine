import { d, moneyStr } from "./money.ts";
import type { EdgeConfig } from "./config.ts";
import { DEFAULT_CONFIG } from "./config.ts";
import { evaluateSpread } from "./strategies/spread.ts";
import { evaluateTriangles } from "./strategies/triangle.ts";
import { evaluateDexMonitor } from "./strategies/dex-monitor.ts";
import { FixtureDexProvider } from "./adapters/dex.ts";
import { buildFixturePacks, type FixtureCase } from "./fixtures.ts";
import { reviewSignal, evaluateLiveGate, shouldAutoKill, type RiskSnapshot } from "./risk.ts";
import { attemptLiveOrder } from "./live-broker.ts";
import {
  cancelPaperOrder,
  seedPaperInventory,
  submitPaperOrder,
  type PaperBalance,
  type PaperOrder,
  type PaperState,
} from "./paper-broker.ts";
import type { BookSnapshot, CanonicalSymbol, Signal } from "./types.ts";

export interface EngineEvent {
  level: "info" | "warn" | "error";
  type: string;
  message: string;
  tsMs: number;
}

export interface EngineResult {
  signals: Signal[];
  orders: PaperOrder[];
  balances: PaperBalance[];
  events: EngineEvent[];
  liveBlocked: { message: string; failed: string[] }[];
  autoKill: boolean;
  liveGate: ReturnType<typeof evaluateLiveGate>;
}

function baseSnap(cfg: EdgeConfig, nowMs: number, overrides: Partial<RiskSnapshot> = {}): RiskSnapshot {
  return {
    killSwitch: cfg.killSwitch,
    consecutiveErrors: 0,
    dailyRealizedPnl: "0",
    equity: "20000",
    peakEquity: "20000",
    openOrders: 0,
    openPositions: 0,
    cooldownUntilMs: 0,
    nowMs,
    dataAgeMs: 0,
    clockDriftMs: 0,
    feesConfigured: true,
    marketTrading: true,
    strategyPaused: false,
    strategyLiveEnabled: false,
    exchangeTradingEnabled: false,
    apiKeyConfigured: false,
    withdrawalPermission: false,
    riskEngineHealthy: true,
    ...overrides,
  };
}

function paperFromSignal(
  state: PaperState,
  signal: Signal,
  books: { buy?: BookSnapshot; sell?: BookSnapshot },
  cfg: EdgeConfig,
  nowMs: number,
): PaperOrder[] {
  const out: PaperOrder[] = [];
  if (!signal.buyVenue || !signal.sellVenue || !signal.qty || !books.buy || !books.sell) return out;
  const feeBuy = d(signal.buyVenue === "bybit" ? cfg.takerFeeBybit : cfg.takerFeeBinance);
  const feeSell = d(signal.sellVenue === "bybit" ? cfg.takerFeeBybit : cfg.takerFeeBinance);
  const buy = submitPaperOrder(
    state,
    {
      venue: signal.buyVenue,
      symbol: books.buy.symbol,
      side: "buy",
      type: "market",
      qty: signal.qty,
      feeRate: feeBuy,
      clientId: signal.id + "-b",
      strategyId: signal.strategyId,
      signalId: signal.id,
    },
    { book: books.buy, nowMs, minQty: d("0.00001"), minNotional: d("5"), allowPartial: false },
  );
  out.push(buy);
  if (buy.status === "filled" || buy.status === "partially_filled") {
    const sell = submitPaperOrder(
      state,
      {
        venue: signal.sellVenue,
        symbol: books.sell.symbol,
        side: "sell",
        type: "market",
        qty: buy.filledQty,
        feeRate: feeSell,
        clientId: signal.id + "-s",
        strategyId: signal.strategyId,
        signalId: signal.id,
      },
      { book: books.sell, nowMs, minQty: d("0.00001"), minNotional: d("5"), allowPartial: false },
    );
    out.push(sell);
  }
  return out;
}

export function runFixtureSuite(
  cfg: EdgeConfig = DEFAULT_CONFIG,
  nowMs = Date.now(),
  state?: PaperState,
): EngineResult {
  const paper: PaperState = state ?? { balances: seedPaperInventory(), orders: [], latencyMs: 50 };
  const packs = buildFixturePacks(nowMs);
  const signals: Signal[] = [];
  const events: EngineEvent[] = [];
  const liveBlocked: EngineResult["liveBlocked"] = [];
  const snap0 = baseSnap(cfg, nowMs);

  for (const pack of packs) {
    if (pack.id === "triangle_fee_negative" && pack.books) {
      const tri = evaluateTriangles(pack.books, cfg, pack.nowMs);
      for (const s of tri) signals.push(s);
      continue;
    }
    if (!pack.buy || !pack.sell) continue;
    const forceQty =
      pack.id === "risk_limit" ? "2" : pack.id === "insufficient_depth" ? "1" : pack.id === "valid_paper" ? undefined : "0.05";
    const signal = evaluateSpread({
      buy: pack.buy,
      sell: pack.sell,
      cfg,
      nowMs: pack.nowMs,
      forceQty,
    });
    signal.details.fixture = pack.id;
    signal.details.fixtureTitle = pack.title;
    signal.details.fixtureNote = pack.explanation;

    const age = Math.max(pack.nowMs - pack.buy.tsMs, pack.nowMs - pack.sell.tsMs);
    const snap = baseSnap(cfg, pack.nowMs, { dataAgeMs: age });
    if (pack.id === "risk_limit") {
      signal.details.grossCost = moneyStr(d("2").mul(d("50000")), 2);
    }
    const decision = reviewSignal(signal, cfg, snap);
    if (!decision.allow) {
      signal.status = "blocked";
      signal.reasons = [...signal.reasons, ...decision.reasons];
    }
    signals.push(signal);

    if (signal.status === "accepted" && decision.allow) {
      const orders = paperFromSignal(paper, signal, { buy: pack.buy, sell: pack.sell }, cfg, pack.nowMs);
      events.push({
        level: "info",
        type: "paper_fill",
        message: `Paper legs for ${pack.id}: ${orders.map((o) => o.status).join(",")}`,
        tsMs: pack.nowMs,
      });
    } else {
      events.push({
        level: "info",
        type: "signal_rejected",
        message: `${pack.id}: ${signal.reasons.join(", ")}`,
        tsMs: pack.nowMs,
      });
    }

    // Always demonstrate live gate block
    const liveSnap = baseSnap(cfg, pack.nowMs, { dataAgeMs: age });
    const live = attemptLiveOrder(cfg, liveSnap, {
      venue: "binance",
      symbol: pack.buy.symbol,
      side: "buy",
      type: "market",
      qty: d("0.001"),
      feeRate: d(cfg.takerFeeBinance),
      clientId: "live-demo",
      strategyId: "spread",
      signalId: signal.id,
    });
    liveBlocked.push({ message: live.message, failed: live.failed });
  }

  // DEX monitor fixture
  const valid = packs.find((p) => p.id === "valid_paper");
  if (valid?.buy) {
    const dex = new FixtureDexProvider();
    void dex.quote({
      chain: "ethereum",
      tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      tokenOut: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      amountIn: "1000000000000000000",
    }).then(() => undefined);
  }

  const gate = evaluateLiveGate(cfg, snap0);
  const autoKill = shouldAutoKill(cfg, snap0);
  return {
    signals,
    orders: paper.orders,
    balances: paper.balances,
    events,
    liveBlocked,
    autoKill,
    liveGate: gate,
  };
}

export async function dexMonitorSignal(cexBook: BookSnapshot, cfg: EdgeConfig, nowMs: number): Promise<Signal> {
  const provider = new FixtureDexProvider();
  const q = await provider.quote({
    chain: "ethereum",
    tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    tokenOut: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    amountIn: "1000000000000000000",
  });
  return evaluateDexMonitor({
    cexBook,
    dex: q,
    qty: "0.01",
    nowMs,
    buffer: cfg.uncertaintyBufferUsdt,
  });
}

export function killAndCancel(state: PaperState, nowMs: number): number {
  let n = 0;
  for (const o of [...state.orders]) {
    if (o.status === "new" || o.status === "accepted" || o.status === "partially_filled") {
      if (cancelPaperOrder(state, o.id, nowMs)) n += 1;
    }
  }
  return n;
}

export type { FixtureCase, CanonicalSymbol };
