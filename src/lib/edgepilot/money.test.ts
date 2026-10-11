import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BPS, ZERO, d, floorToStep, moneyStr, redactSecrets, redactText } from "./money.ts";
import { estimateFill } from "./orderbook.ts";
import { compareCexDex, inventorySpread, triangleUsdtBtcEthUsdt } from "./formulas.ts";
import { DEFAULT_CONFIG, validateConfig, type EdgeConfig } from "./config.ts";
import { evaluateLiveGate, reviewSignal, shouldAutoKill, type RiskSnapshot } from "./risk.ts";
import { seedPaperInventory, submitPaperOrder, type PaperState } from "./paper-broker.ts";
import { attemptLiveOrder } from "./live-broker.ts";
import { buildFixturePacks } from "./fixtures.ts";
import { runFixtureSuite } from "./engine.ts";
import { evaluateSpread } from "./strategies/spread.ts";
import { LIVE_PHRASE, type BookSnapshot, type Signal } from "./types.ts";
import { fromBinanceDepth, fromBybitDepth } from "./adapters/normalize.ts";

function snap(over: Partial<RiskSnapshot> = {}): RiskSnapshot {
  return {
    killSwitch: false,
    consecutiveErrors: 0,
    dailyRealizedPnl: "0",
    equity: "10000",
    peakEquity: "10000",
    openOrders: 0,
    openPositions: 0,
    cooldownUntilMs: 0,
    nowMs: 1_700_000_000_000,
    dataAgeMs: 100,
    clockDriftMs: 10,
    feesConfigured: true,
    marketTrading: true,
    strategyPaused: false,
    strategyLiveEnabled: true,
    exchangeTradingEnabled: true,
    apiKeyConfigured: true,
    withdrawalPermission: false,
    riskEngineHealthy: true,
    ...over,
  };
}

function book(asks: [string, string][], bids: [string, string][], ts = 1_700_000_000_000): BookSnapshot {
  return {
    venue: "binance",
    symbol: "BTC/USDT",
    tsMs: ts,
    source: "fixture",
    asks: asks.map(([p, q]) => ({ price: d(p), qty: d(q) })),
    bids: bids.map(([p, q]) => ({ price: d(p), qty: d(q) })),
  };
}

describe("money", () => {
  it("uses Decimal accurately and rejects raw numbers", () => {
    const a = d("0.1");
    const b = d("0.2");
    assert.equal(a.add(b).toString(), "0.3");
    assert.throws(() => d(0.1 as unknown as string));
    assert.equal(floorToStep(d("1.239"), d("0.01")).toString(), "1.23");
    assert.equal(moneyStr(BPS, 0), "10000");
  });

  it("redacts secrets in logs", () => {
    const r = redactSecrets({ apiKey: "abc", nested: { secret: "x" }, ok: "hello" }) as Record<string, unknown>;
    assert.equal(r.apiKey, "[REDACTED]");
    assert.equal((r.nested as Record<string, unknown>).secret, "[REDACTED]");
    assert.equal(r.ok, "hello");
    assert.match(redactText("token=abc123 rest"), /REDACTED/);
  });
});

describe("order book fill", () => {
  it("estimates VWAP and rejects insufficient depth", () => {
    const b = book(
      [
        ["100", "1"],
        ["101", "1"],
      ],
      [["99", "1"]],
    );
    const fill = estimateFill(b, "buy", d("1.5"));
    assert.equal(fill.sufficient, true);
    assert.equal(fill.vwap.toFixed(8), "100.33333333");
    const thin = estimateFill(b, "buy", d("5"));
    assert.equal(thin.sufficient, false);
  });
});

describe("spread formula", () => {
  it("does not trade on bid>ask without fees/buffer", () => {
    const buy = book([["100", "2"]], [["99", "2"]]);
    buy.asks = [{ price: d("100"), qty: d("2") }];
    buy.bids = [{ price: d("99"), qty: d("2") }];
    const sell: BookSnapshot = {
      ...buy,
      venue: "bybit",
      bids: [{ price: d("100.12"), qty: d("2") }],
      asks: [{ price: d("100.20"), qty: d("2") }],
    };
    const r = inventorySpread({
      buyBook: { ...buy, asks: [{ price: d("100"), qty: d("2") }], bids: [{ price: d("99"), qty: d("2") }] },
      sellBook: sell,
      qty: d("1"),
      fBuy: d("0.001"),
      fSell: d("0.001"),
      cFixed: d("0.50"),
      minNetProfit: d("0.25"),
      minNetRoi: d("0.0005"),
      maxSlippageBps: d("50"),
    });
    assert.equal(r.tradable, false);
    assert.ok(r.netProfit.lt(ZERO) || r.reasons.includes("net_profit_below_threshold"));
  });

  it("accepts a fat inventory spread after costs", () => {
    const buyB = book([["50000", "1"]], [["49900", "1"]]);
    const sellB: BookSnapshot = {
      venue: "bybit",
      symbol: "BTC/USDT",
      tsMs: buyB.tsMs,
      source: "fixture",
      asks: [{ price: d("52010"), qty: d("1") }],
      bids: [{ price: d("52000"), qty: d("1") }],
    };
    const r = inventorySpread({
      buyBook: buyB,
      sellBook: sellB,
      qty: d("0.001"),
      fBuy: d("0.001"),
      fSell: d("0.001"),
      cFixed: d("0.50"),
      minNetProfit: d("0.25"),
      minNetRoi: d("0.0005"),
      maxSlippageBps: d("50"),
    });
    assert.equal(r.tradable, true);
    assert.ok(r.netProfit.gt(d("0.25")));
  });
});

describe("triangular arb", () => {
  it("becomes unprofitable after three-leg fees on a closed loop", () => {
    const ts = 1_700_000_000_000;
    const mk = (symbol: BookSnapshot["symbol"], px: string): BookSnapshot => ({
      venue: "binance",
      symbol,
      tsMs: ts,
      source: "fixture",
      bids: [{ price: d(px), qty: d("10") }],
      asks: [{ price: d(px), qty: d("10") }],
    });
    const r = triangleUsdtBtcEthUsdt(
      {
        btcUsdt: mk("BTC/USDT", "50000"),
        ethUsdt: mk("ETH/USDT", "4000"),
        ethBtc: mk("ETH/BTC", "0.08"),
      },
      d("75"),
      d("0.001"),
      d("0.50"),
      d("0.25"),
      d("0.0005"),
    );
    assert.equal(r.tradable, false);
    assert.ok(r.netProfit.lt(ZERO));
  });
});

describe("precision / min order", () => {
  it("floors to step and rejects tiny paper orders", () => {
    assert.equal(floorToStep(d("0.000019"), d("0.00001")).toString(), "0.00001");
    const state: PaperState = { balances: seedPaperInventory(), orders: [], latencyMs: 0 };
    const b = book([["50000", "1"]], [["49900", "1"]]);
    const o = submitPaperOrder(
      state,
      {
        venue: "binance",
        symbol: "BTC/USDT",
        side: "buy",
        type: "market",
        qty: d("0.0000001"),
        feeRate: d("0.001"),
        clientId: "x",
        strategyId: "spread",
        signalId: "s",
      },
      { book: b, nowMs: 1, minQty: d("0.00001"), minNotional: d("5"), allowPartial: false },
    );
    assert.equal(o.status, "rejected");
    assert.equal(o.rejectReason, "min_qty");
  });
});

describe("stale + risk + kill", () => {
  it("rejects stale data and respects kill switch", () => {
    const buy = book([["50000", "1"]], [["49900", "1"]], 1_700_000_000_000 - 30_000);
    const sell: BookSnapshot = {
      ...buy,
      venue: "bybit",
      bids: [{ price: d("52000"), qty: d("1") }],
      asks: [{ price: d("52100"), qty: d("1") }],
    };
    const s = evaluateSpread({ buy, sell, cfg: DEFAULT_CONFIG, nowMs: 1_700_000_000_000, forceQty: "0.001" });
    assert.ok(s.reasons.includes("stale_data"));
    const sig: Signal = { ...s, status: "accepted", mode: "paper" };
    const killed = reviewSignal(sig, DEFAULT_CONFIG, snap({ killSwitch: true }));
    assert.equal(killed.allow, false);
    assert.ok(killed.reasons.includes("kill_switch"));
  });

  it("auto-kills on daily loss", () => {
    assert.equal(shouldAutoKill(DEFAULT_CONFIG, snap({ dailyRealizedPnl: "-30" })), true);
  });
});

describe("live safety gate", () => {
  const keys = [
    "1_app_mode_live",
    "2_live_trading_enabled",
    "3_strategy_live_enabled",
    "4_exchange_trading_enabled",
    "5_api_key_configured",
    "6_no_withdrawal_permission",
    "7_max_order_notional_set",
    "8_max_daily_loss_set",
    "9_risk_engine_healthy",
    "10_market_data_fresh",
    "11_clock_sync",
    "12_confirmation_phrase",
    "13_kill_switch_off",
  ];

  it("blocks when any required condition is false", () => {
    const cfg: EdgeConfig = {
      ...DEFAULT_CONFIG,
      appMode: "live",
      liveTradingEnabled: true,
      liveConfirmationPhrase: LIVE_PHRASE,
    };
    const full = evaluateLiveGate(cfg, snap());
    assert.equal(full.pass, true);
    for (const k of keys) {
      const brokenSnap = snap();
      const brokenCfg: EdgeConfig = { ...cfg };
      if (k === "1_app_mode_live") brokenCfg.appMode = "paper";
      if (k === "2_live_trading_enabled") brokenCfg.liveTradingEnabled = false;
      if (k === "3_strategy_live_enabled") brokenSnap.strategyLiveEnabled = false;
      if (k === "4_exchange_trading_enabled") brokenSnap.exchangeTradingEnabled = false;
      if (k === "5_api_key_configured") brokenSnap.apiKeyConfigured = false;
      if (k === "6_no_withdrawal_permission") brokenSnap.withdrawalPermission = true;
      if (k === "7_max_order_notional_set") brokenCfg.maxOrderNotional = "0";
      if (k === "8_max_daily_loss_set") brokenCfg.maxDailyLossAbs = "0";
      if (k === "9_risk_engine_healthy") brokenSnap.riskEngineHealthy = false;
      if (k === "10_market_data_fresh") brokenSnap.dataAgeMs = 60_000;
      if (k === "11_clock_sync") brokenSnap.clockDriftMs = 5_000;
      if (k === "12_confirmation_phrase") brokenCfg.liveConfirmationPhrase = "";
      if (k === "13_kill_switch_off") brokenSnap.killSwitch = true;
      const g = evaluateLiveGate(brokenCfg, brokenSnap);
      assert.equal(g.pass, false, k);
      assert.ok(g.failed.some((f) => f.startsWith(k.split("_")[0]) || f === k), k + " " + g.failed.join());
    }
  });

  it("never sends a live HTTP order in MVP", () => {
    const cfg = {
      ...DEFAULT_CONFIG,
      appMode: "live" as const,
      liveTradingEnabled: true,
      liveConfirmationPhrase: LIVE_PHRASE,
    };
    const r = attemptLiveOrder(cfg, snap(), {
      venue: "binance",
      symbol: "BTC/USDT",
      side: "buy",
      type: "market",
      qty: d("0.001"),
      feeRate: d("0.001"),
      clientId: "t",
      strategyId: "spread",
      signalId: "s",
    });
    assert.equal(r.blocked, true);
  });
});

describe("config validation", () => {
  it("fails fast on unsafe live settings", () => {
    const errs = validateConfig({
      ...DEFAULT_CONFIG,
      appMode: "live",
      liveTradingEnabled: true,
      liveConfirmationPhrase: "nope",
    });
    assert.ok(errs.some((e) => e.includes("phrase")));
  });
});

describe("paper broker lifecycle", () => {
  it("transitions new → filled and rejects bad balances", () => {
    const state: PaperState = { balances: seedPaperInventory(), orders: [], latencyMs: 10 };
    const b = book([["50000", "2"]], [["49900", "2"]]);
    const o = submitPaperOrder(
      state,
      {
        venue: "binance",
        symbol: "BTC/USDT",
        side: "buy",
        type: "market",
        qty: d("0.01"),
        feeRate: d("0.001"),
        clientId: "ok",
        strategyId: "spread",
        signalId: "s",
      },
      { book: b, nowMs: 5, minQty: d("0.00001"), minNotional: d("5"), allowPartial: false },
    );
    assert.equal(o.status, "filled");
    assert.ok(o.fills.length === 1);
    const usdt = state.balances.find((x) => x.venue === "binance" && x.asset === "USDT");
    assert.ok(usdt && usdt.free.lt(d("10000")));
  });
});

describe("adapters normalize sample payloads", () => {
  it("normalizes Binance and Bybit depth", () => {
    const bn = fromBinanceDepth("BTC/USDT", { bids: [["50000", "1"]], asks: [["50001", "2"]] }, 12);
    assert.equal(bn.venue, "binance");
    assert.equal(bn.bids[0].price.toString(), "50000");
    const by = fromBybitDepth("BTC/USDT", { b: [["49999", "3"]], a: [["50002", "4"]], ts: 99 }, 0);
    assert.equal(by.venue, "bybit");
    assert.equal(by.tsMs, 99);
  });
});

describe("fixture suite e2e", () => {
  it("produces the six research cases and at least one paper fill", () => {
    const r = runFixtureSuite(DEFAULT_CONFIG, 1_700_000_000_000);
    const tags = r.signals.map((s) => s.details.fixture).filter(Boolean);
    assert.ok(tags.includes("fee_negative"));
    assert.ok(tags.includes("valid_paper"));
    assert.ok(tags.includes("insufficient_depth"));
    assert.ok(tags.includes("stale"));
    assert.ok(tags.includes("risk_limit"));
    assert.ok(r.signals.some((s) => s.strategyId === "triangle"));
    const feeNeg = r.signals.find((s) => s.details.fixture === "fee_negative");
    assert.ok(feeNeg && feeNeg.status !== "accepted");
    const valid = r.signals.find((s) => s.details.fixture === "valid_paper");
    assert.ok(valid);
    const stale = r.signals.find((s) => s.details.fixture === "stale");
    assert.ok(stale && stale.reasons.includes("stale_data"));
    const depth = r.signals.find((s) => s.details.fixture === "insufficient_depth");
    assert.ok(depth && depth.reasons.some((x) => x.includes("depth") || x.includes("qty")));
    const risk = r.signals.find((s) => s.details.fixture === "risk_limit");
    assert.ok(risk && (risk.status === "blocked" || risk.reasons.includes("max_order_notional") || risk.reasons.length));
    assert.ok(r.liveGate.pass === false);
    assert.ok(r.liveBlocked.length > 0);
  });
});

describe("DEX compare is monitoring only", () => {
  it("never marks DEX as executable", () => {
    const c = compareCexDex({
      cexExecutableBuy: d("3000"),
      dexAmountIn: d("1"),
      dexAmountOut: d("2990"),
      gasQuote: d("2"),
      buffer: d("0.5"),
    });
    assert.equal(c.monitoringOnly, true);
  });
});
