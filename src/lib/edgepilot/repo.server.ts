import { getSql } from "@/lib/db";
import { DEFAULT_CONFIG, type EdgeConfig, displayMode } from "./config.ts";
import { moneyStr } from "./money.ts";
import { runFixtureSuite, dexMonitorSignal, type EngineResult } from "./engine.ts";
import { seedPaperInventory, markToMarket, type PaperBalance } from "./paper-broker.ts";
import { d } from "./money.ts";
import { fetchVenueBook, fetchBinanceServerTime } from "./adapters/cex.ts";
import { evaluateSpread } from "./strategies/spread.ts";
import { evaluateTriangles } from "./strategies/triangle.ts";
import { evaluateLiveGate } from "./risk.ts";
import type { CanonicalSymbol, Signal } from "./types.ts";
import { serializeBook } from "./orderbook.ts";
import type { BookSnapshot } from "./types.ts";
import type { DashboardDto } from "./dashboard-dto.ts";

const STRATEGIES = [
  {
    id: "spread",
    name: "Multi-CEX inventory spread",
    kind: "spread",
    notes: "Paper trader. Pre-funded inventory on Binance and Bybit. No transfers.",
  },
  {
    id: "triangle",
    name: "Binance triangular scanner",
    kind: "triangle",
    notes: "USDT triangles on Binance spot. Paper only by default.",
  },
  {
    id: "dex_monitor",
    name: "CEX/DEX discrepancy monitor",
    kind: "dex_monitor",
    notes: "MONITORING ONLY. Never executes swaps.",
  },
];

export async function ensureWorkspace(userId: string): Promise<void> {
  const sql = await getSql();
  const existing = await sql`select user_id from system_state where user_id = ${userId}`;
  if (existing.length) return;

  await sql.query(
    `insert into system_state (user_id, config_json, app_mode) values ($1, $2::jsonb, 'paper')`,
    [userId, JSON.stringify(DEFAULT_CONFIG)],
  );
  for (const s of STRATEGIES) {
    await sql`
      insert into strategies (id, user_id, name, kind, notes)
      values (${s.id}, ${userId}, ${s.name}, ${s.kind}, ${s.notes})
    `;
    await sql`
      insert into strategy_configs (user_id, strategy_id, config_json)
      values (${userId}, ${s.id}, '{}'::jsonb)
    `;
  }
  for (const ex of [
    ["binance", "Binance Spot"],
    ["bybit", "Bybit Spot"],
  ]) {
    await sql`
      insert into exchanges (user_id, id, name, taker_fee)
      values (${userId}, ${ex[0]}, ${ex[1]}, 0.001)
    `;
    await sql`
      insert into exchange_accounts (user_id, exchange_id)
      values (${userId}, ${ex[0]})
    `;
  }
  const bals = seedPaperInventory();
  for (const b of bals) {
    await sql`
      insert into balances (user_id, mode, venue, asset, free, locked)
      values (${userId}, 'paper', ${b.venue}, ${b.asset}, ${moneyStr(b.free, 12)}::numeric, 0)
    `;
  }
  await sql`
    insert into system_events (user_id, kind, message)
    values (${userId}, 'startup', 'Workspace initialized. Default mode PAPER. Live trading disabled.')
  `;
}

export async function loadConfig(userId: string): Promise<EdgeConfig> {
  const sql = await getSql();
  const rows = await sql<{ config_json: EdgeConfig; kill_switch: boolean }>`
    select config_json, kill_switch from system_state where user_id = ${userId}
  `;
  const cfg = { ...DEFAULT_CONFIG, ...(rows[0]?.config_json ?? {}) };
  cfg.killSwitch = Boolean(rows[0]?.kill_switch);
  return cfg;
}

function signalRow(userId: string, s: Signal) {
  return {
    id: s.id,
    userId,
    strategyId: s.strategyId,
    status: s.status,
    symbol: s.symbol,
    expectedProfit: moneyStr(s.expectedProfit, 12),
    expectedRoi: moneyStr(s.expectedRoi, 12),
    reasons: s.reasons.join("|"),
    details: JSON.stringify(s.details),
    mode: s.mode,
    dataTs: new Date(s.dataTsMs).toISOString(),
  };
}

async function persistEngine(userId: string, result: EngineResult, source: string) {
  const sql = await getSql();
  for (const s of result.signals) {
    const r = signalRow(userId, s);
    await sql`
      insert into signals (id, user_id, strategy_id, status, symbol, expected_profit, expected_roi, reasons, details_json, mode, data_ts)
      values (${r.id}, ${r.userId}, ${r.strategyId}, ${r.status}, ${r.symbol}, ${r.expectedProfit}::numeric, ${r.expectedRoi}::numeric, ${r.reasons}, ${r.details}::jsonb, ${r.mode}, ${r.dataTs}::timestamptz)
      on conflict (id) do nothing
    `;
    await sql`
      insert into opportunities (id, user_id, strategy_id, symbol, expected_profit, expected_roi, status, explanation)
      values (${r.id}, ${r.userId}, ${r.strategyId}, ${r.symbol}, ${r.expectedProfit}::numeric, ${r.expectedRoi}::numeric, ${r.status}, ${s.details.explanation ?? s.reasons.join(", ")})
      on conflict (id) do nothing
    `;
  }
  for (const o of result.orders) {
    await sql`
      insert into orders (id, user_id, venue, market, side, order_type, qty, filled_qty, avg_price, status, reject_reason, strategy_id, signal_id, mode)
      values (
        ${o.id}, ${userId}, ${o.venue}, ${o.symbol}, ${o.side}, ${o.type},
        ${moneyStr(o.qty, 12)}::numeric, ${moneyStr(o.filledQty, 12)}::numeric,
        ${moneyStr(o.avgPrice, 12)}::numeric, ${o.status}, ${o.rejectReason ?? null},
        ${o.strategyId}, ${o.signalId}, 'paper'
      )
      on conflict (id) do nothing
    `;
    for (const f of o.fills) {
      await sql`
        insert into fills (user_id, order_id, price, qty, fee, fee_asset, mode)
        values (${userId}, ${o.id}, ${moneyStr(f.price, 12)}::numeric, ${moneyStr(f.qty, 12)}::numeric, ${moneyStr(f.fee, 12)}::numeric, ${f.feeAsset}, 'paper')
      `;
    }
  }
  for (const b of result.balances) {
    await sql`
      insert into balances (user_id, mode, venue, asset, free, locked, updated_at)
      values (${userId}, 'paper', ${b.venue}, ${b.asset}, ${moneyStr(b.free, 12)}::numeric, ${moneyStr(b.locked, 12)}::numeric, now())
      on conflict (user_id, mode, venue, asset)
      do update set free = excluded.free, locked = excluded.locked, updated_at = now()
    `;
  }
  for (const e of result.events) {
    await sql`
      insert into system_events (user_id, kind, message)
      values (${userId}, ${e.type}, ${e.message})
    `;
  }
  for (const b of result.liveBlocked.slice(0, 3)) {
    await sql`
      insert into risk_events (user_id, severity, kind, message, details_json)
      values (${userId}, 'info', 'live_blocked', ${b.message}, ${JSON.stringify({ failed: b.failed })}::jsonb)
    `;
  }
  await sql`
    insert into alert_logs (user_id, kind, message, dedup_key)
    values (${userId}, 'scan', ${"Scan complete (" + source + ")"}, ${"scan-" + source + "-" + Date.now()})
  `;
  await sql`update system_state set last_scan_at = now() where user_id = ${userId}`;
}

export async function runAndPersistFixtures(userId: string): Promise<{ signals: number; orders: number }> {
  await ensureWorkspace(userId);
  const cfg = await loadConfig(userId);
  const sql = await getSql();
  const bals = await sql<{ venue: string; asset: string; free: string; locked: string }>`
    select venue, asset, free, locked from balances where user_id = ${userId} and mode = 'paper'
  `;
  const paperBals: PaperBalance[] = bals.map((b) => ({
    venue: b.venue as PaperBalance["venue"],
    asset: b.asset,
    free: d(b.free),
    locked: d(b.locked),
  }));
  const result = runFixtureSuite(cfg, Date.now(), {
    balances: paperBals.length ? paperBals : seedPaperInventory(),
    orders: [],
    latencyMs: 40,
  });
  await persistEngine(userId, result, "fixtures");
  const eq = markToMarket(
    result.balances,
    { "BTC/USDT": d("50000"), "ETH/USDT": d("4000"), "SOL/USDT": d("140") },
  );
  await sql`
    insert into portfolio_snapshots (user_id, mode, equity)
    values (${userId}, 'paper', ${moneyStr(eq, 8)}::numeric)
  `;
  return { signals: result.signals.length, orders: result.orders.length };
}

export async function runLiveMarketScan(userId: string): Promise<{ ok: boolean; error?: string; signals: number }> {
  await ensureWorkspace(userId);
  const cfg = await loadConfig(userId);
  const sql = await getSql();
  const pairs: CanonicalSymbol[] = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];
  const books: { venue: "binance" | "bybit"; symbol: CanonicalSymbol; book: BookSnapshot }[] = [];
  const errors: string[] = [];
  let drift = 0;
  try {
    const server = await fetchBinanceServerTime();
    drift = Math.abs(Date.now() - server);
  } catch (e) {
    errors.push("clock: " + (e instanceof Error ? e.message : "fail"));
    drift = 99999;
  }
  for (const symbol of pairs) {
    for (const venue of ["binance", "bybit"] as const) {
      try {
        const book = await fetchVenueBook(venue, symbol);
        books.push({ venue, symbol, book });
        const ser = serializeBook(book);
        await sql`
          insert into orderbook_snapshots (user_id, venue, market, ts, bids_json, asks_json, source)
          values (${userId}, ${venue}, ${symbol}, ${new Date(book.tsMs).toISOString()}::timestamptz, ${JSON.stringify(ser.bids)}::jsonb, ${JSON.stringify(ser.asks)}::jsonb, 'rest')
        `;
        const bid = book.bids[0]?.price ?? d("0");
        const ask = book.asks[0]?.price ?? d("0");
        await sql`
          insert into price_snapshots (user_id, venue, market, bid, ask, last, ts, source)
          values (${userId}, ${venue}, ${symbol}, ${moneyStr(bid)}::numeric, ${moneyStr(ask)}::numeric, ${moneyStr(ask)}::numeric, ${new Date(book.tsMs).toISOString()}::timestamptz, 'rest')
        `;
        await sql`update exchanges set last_ok_at = now(), status = 'ok', last_error = null where user_id = ${userId} and id = ${venue}`;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "fetch fail";
        errors.push(`${venue} ${symbol}: ${msg}`);
        await sql`update exchanges set status = 'error', last_error = ${msg} where user_id = ${userId} and id = ${venue}`;
      }
    }
  }

  const signals: Signal[] = [];
  const nowMs = Date.now();
  for (const symbol of pairs) {
    const bn = books.find((b) => b.venue === "binance" && b.symbol === symbol)?.book;
    const by = books.find((b) => b.venue === "bybit" && b.symbol === symbol)?.book;
    if (bn && by) {
      signals.push(evaluateSpread({ buy: bn, sell: by, cfg, nowMs }));
      signals.push(evaluateSpread({ buy: by, sell: bn, cfg, nowMs }));
    }
  }
  try {
    const btc = await fetchVenueBook("binance", "BTC/USDT");
    const eth = await fetchVenueBook("binance", "ETH/USDT");
    const ethbtc = await fetchVenueBook("binance", "ETH/BTC");
    signals.push(...evaluateTriangles({ btcUsdt: btc, ethUsdt: eth, ethBtc: ethbtc }, cfg, nowMs));
    const dex = await dexMonitorSignal(eth, cfg, nowMs);
    signals.push(dex);
  } catch (e) {
    errors.push("triangle/dex: " + (e instanceof Error ? e.message : "fail"));
  }

  const result: EngineResult = {
    signals,
    orders: [],
    balances: [],
    events: errors.map((message) => ({
      level: "warn" as const,
      type: "feed_error",
      message,
      tsMs: nowMs,
    })),
    liveBlocked: [],
    autoKill: false,
    liveGate: evaluateLiveGate(cfg, {
      killSwitch: cfg.killSwitch,
      consecutiveErrors: errors.length,
      dailyRealizedPnl: "0",
      equity: "20000",
      peakEquity: "20000",
      openOrders: 0,
      openPositions: 0,
      cooldownUntilMs: 0,
      nowMs,
      dataAgeMs: 0,
      clockDriftMs: drift,
      feesConfigured: true,
      marketTrading: true,
      strategyPaused: false,
      strategyLiveEnabled: false,
      exchangeTradingEnabled: false,
      apiKeyConfigured: false,
      withdrawalPermission: false,
      riskEngineHealthy: true,
    }),
  };
  await persistEngine(userId, result, "live-scan");
  if (drift > cfg.maxClockDriftMs) {
    await sql`
      insert into risk_events (user_id, severity, kind, message, details_json)
      values (${userId}, 'warn', 'clock_drift', ${"Clock drift " + drift + "ms"}, '{}'::jsonb)
    `;
  }
  return { ok: errors.length === 0, error: errors[0], signals: signals.length };
}

export async function setKillSwitch(userId: string, on: boolean): Promise<void> {
  const sql = await getSql();
  await sql`update system_state set kill_switch = ${on}, updated_at = now() where user_id = ${userId}`;
  await sql`
    insert into config_audit_logs (user_id, field, old_value, new_value)
    values (${userId}, 'kill_switch', ${on ? "false" : "true"}, ${on ? "true" : "false"})
  `;
  await sql`
    insert into system_events (user_id, kind, message)
    values (${userId}, 'kill_switch', ${on ? "Kill switch ARMED — new orders halted." : "Kill switch cleared."})
  `;
  await sql`
    insert into risk_events (user_id, severity, kind, message, details_json)
    values (${userId}, ${on ? "critical" : "info"}, 'kill_switch', ${on ? "Kill switch activated" : "Kill switch cleared"}, '{}'::jsonb)
  `;
  await sql`
    insert into alert_logs (user_id, kind, message, dedup_key)
    values (${userId}, 'kill_switch', ${on ? "Kill switch activated" : "Kill switch cleared"}, ${"kill-" + on + "-" + Date.now()})
  `;
}

export async function patchConfig(
  userId: string,
  patch: Partial<EdgeConfig>,
): Promise<{ ok: boolean; errors: string[] }> {
  const cfg = await loadConfig(userId);
  const next = { ...cfg, ...patch };
  const { validateConfig } = await import("./config.ts");
  const errors = validateConfig(next);
  if (next.appMode === "live" && next.liveTradingEnabled && errors.length) {
    return { ok: false, errors };
  }
  const sql = await getSql();
  await sql`
    update system_state
    set config_json = ${JSON.stringify(next)}::jsonb,
        app_mode = ${next.appMode},
        live_trading_enabled = ${next.liveTradingEnabled},
        live_phrase_set = ${Boolean(next.liveConfirmationPhrase)},
        updated_at = now()
    where user_id = ${userId}
  `;
  for (const [k, v] of Object.entries(patch)) {
    await sql`
      insert into config_audit_logs (user_id, field, old_value, new_value)
      values (${userId}, ${k}, ${String((cfg as unknown as Record<string, unknown>)[k] ?? "")}, ${k.toLowerCase().includes("phrase") || k.toLowerCase().includes("token") ? "[REDACTED]" : String(v)})
    `;
  }
  return { ok: true, errors: [] };
}

export async function setStrategyFlags(
  userId: string,
  id: string,
  flags: { paused?: boolean; enabled?: boolean; liveEnabled?: boolean },
) {
  const sql = await getSql();
  if (flags.paused !== undefined) {
    await sql`update strategies set paused = ${flags.paused} where user_id = ${userId} and id = ${id}`;
  }
  if (flags.enabled !== undefined) {
    await sql`update strategies set enabled = ${flags.enabled} where user_id = ${userId} and id = ${id}`;
  }
  if (flags.liveEnabled !== undefined) {
    await sql`update strategies set live_enabled = ${false} where user_id = ${userId} and id = ${id}`;
    // live stays false in MVP unless all gates; still record the attempt
    await sql`
      insert into config_audit_logs (user_id, field, old_value, new_value)
      values (${userId}, ${"strategy." + id + ".live_enabled"}, 'false', 'false (MVP forces paper)')
    `;
  }
}

export async function loadDashboard(userId: string): Promise<DashboardDto> {
  await ensureWorkspace(userId);
  const sql = await getSql();
  const state = await sql<{
    kill_switch: boolean;
    last_scan_at: string | null;
    consecutive_errors: number;
    config_json: EdgeConfig;
  }>`select kill_switch, last_scan_at, consecutive_errors, config_json from system_state where user_id = ${userId}`;
  const cfg = { ...DEFAULT_CONFIG, ...(state[0]?.config_json ?? {}) };
  cfg.killSwitch = Boolean(state[0]?.kill_switch);
  const mode = displayMode(cfg, cfg.killSwitch);

  const strategies = await sql<{
    id: string;
    name: string;
    kind: string;
    enabled: boolean;
    paused: boolean;
    live_enabled: boolean;
    notes: string;
  }>`select id, name, kind, enabled, paused, live_enabled, notes from strategies where user_id = ${userId}`;

  const exchanges = await sql<{
    id: string;
    name: string;
    status: string;
    last_error: string | null;
    last_ok_at: string | null;
    trading_enabled: boolean;
    key_configured: boolean;
  }>`select id, name, status, last_error, last_ok_at, trading_enabled, key_configured from exchanges where user_id = ${userId}`;

  const signals = await sql<Record<string, unknown>>`
    select id, strategy_id, status, symbol, expected_profit::text, expected_roi::text, reasons, mode, created_at::text, details_json
    from signals where user_id = ${userId} order by created_at desc limit 80
  `;
  const opportunities = await sql<Record<string, unknown>>`
    select id, strategy_id, symbol, expected_profit::text, expected_roi::text, status, explanation, created_at::text
    from opportunities where user_id = ${userId} order by created_at desc limit 80
  `;
  const orders = await sql<Record<string, unknown>>`
    select id, venue, market, side, order_type, qty::text, filled_qty::text, avg_price::text, status, reject_reason, mode, created_at::text, strategy_id
    from orders where user_id = ${userId} order by created_at desc limit 80
  `;
  const fills = await sql<Record<string, unknown>>`
    select id::text, order_id, price::text, qty::text, fee::text, fee_asset, mode, ts::text
    from fills where user_id = ${userId} order by ts desc limit 80
  `;
  const paperBalances = await sql<Record<string, unknown>>`
    select venue, asset, free::text, locked::text from balances where user_id = ${userId} and mode = 'paper' order by venue, asset
  `;
  const liveBalances = await sql<Record<string, unknown>>`
    select venue, asset, free::text, locked::text from balances where user_id = ${userId} and mode = 'live' order by venue, asset
  `;
  const pnl = await sql<Record<string, unknown>>`
    select id::text, mode, kind, amount::text, note, ts::text from pnl_records where user_id = ${userId} order by ts desc limit 40
  `;
  const riskEvents = await sql<Record<string, unknown>>`
    select id::text, severity, kind, message, ts::text from risk_events where user_id = ${userId} order by ts desc limit 40
  `;
  const systemEvents = await sql<Record<string, unknown>>`
    select id::text, kind, message, ts::text from system_events where user_id = ${userId} order by ts desc limit 40
  `;
  const alerts = await sql<Record<string, unknown>>`
    select id::text, kind, message, ts::text from alert_logs where user_id = ${userId} order by ts desc limit 40
  `;
  const audit = await sql<Record<string, unknown>>`
    select id::text, field, old_value, new_value, ts::text from config_audit_logs where user_id = ${userId} order by ts desc limit 40
  `;

  const paperEqRows = await sql<{ equity: string }>`
    select equity::text from portfolio_snapshots where user_id = ${userId} and mode = 'paper' order by ts desc limit 1
  `;
  const prices: Record<string, ReturnType<typeof d>> = {
    "BTC/USDT": d("50000"),
    "ETH/USDT": d("4000"),
    "SOL/USDT": d("140"),
  };
  const pxRows = await sql<{ market: string; ask: string }>`
    select distinct on (market) market, ask::text from price_snapshots
    where user_id = ${userId} order by market, ts desc
  `;
  for (const p of pxRows) {
    try {
      prices[p.market] = d(p.ask);
    } catch {
      /* keep fixture mark */
    }
  }

  const balsParsed: PaperBalance[] = paperBalances.map((b) => ({
    venue: String(b.venue) as PaperBalance["venue"],
    asset: String(b.asset),
    free: d(String(b.free)),
    locked: d(String(b.locked ?? "0")),
  }));
  const paperEquity = balsParsed.length
    ? moneyStr(markToMarket(balsParsed, prices), 2)
    : paperEqRows[0]?.equity ?? "0.00";

  const counts = await sql<{ c: number }>`select count(*)::int as c from signals where user_id = ${userId}`;
  const acc = await sql<{ c: number }>`select count(*)::int as c from signals where user_id = ${userId} and status = 'accepted'`;
  const rej = await sql<{ c: number }>`select count(*)::int as c from signals where user_id = ${userId} and status in ('rejected','blocked')`;
  const openP = await sql<{ c: number }>`select count(*)::int as c from orders where user_id = ${userId} and mode = 'paper' and status in ('new','accepted','partially_filled')`;
  const risks = await sql<{ c: number }>`select count(*)::int as c from risk_events where user_id = ${userId}`;

  const gate = evaluateLiveGate(cfg, {
    killSwitch: cfg.killSwitch,
    consecutiveErrors: state[0]?.consecutive_errors ?? 0,
    dailyRealizedPnl: "0",
    equity: paperEquity,
    peakEquity: paperEquity,
    openOrders: 0,
    openPositions: 0,
    cooldownUntilMs: 0,
    nowMs: Date.now(),
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
  });

  const stringify = (rows: Record<string, unknown>[]) =>
    rows.map((r) => {
      const o: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) {
        o[k] = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
      }
      return o;
    });

  return {
    mode,
    killSwitch: cfg.killSwitch,
    lastScan: state[0]?.last_scan_at ?? null,
    paperEquity,
    liveEquity: "0.00",
    paperPnl: "est. vs seed — see PnL page",
    livePnl: "0.00 (no live trades)",
    openPaperOrders: openP[0]?.c ?? 0,
    signalsToday: counts[0]?.c ?? 0,
    accepted: acc[0]?.c ?? 0,
    rejected: rej[0]?.c ?? 0,
    riskCount: risks[0]?.c ?? 0,
    consecutiveErrors: state[0]?.consecutive_errors ?? 0,
    liveGateFailed: gate.failed,
    strategies: strategies.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      enabled: s.enabled,
      paused: s.paused,
      liveEnabled: false,
      notes: s.notes,
    })),
    exchanges: exchanges.map((e) => ({
      id: e.id,
      name: e.name,
      status: e.status,
      lastError: e.last_error,
      lastOk: e.last_ok_at,
      tradingEnabled: false,
      keyConfigured: e.key_configured,
    })),
    signals: stringify(signals),
    opportunities: stringify(opportunities),
    orders: stringify(orders),
    fills: stringify(fills),
    paperBalances: stringify(paperBalances),
    liveBalances: stringify(liveBalances),
    pnl: stringify(pnl),
    riskEvents: stringify(riskEvents),
    systemEvents: stringify(systemEvents),
    alerts: stringify(alerts),
    audit: stringify(audit),
    config: { ...cfg, liveConfirmationPhrase: cfg.liveConfirmationPhrase ? "[set]" : "" },
    disclaimer:
      "No strategy guarantees profit. Paper results are simulated. Live trading is disabled unless every safety gate passes. You can lose money.",
  };
}

export async function resetPaper(userId: string) {
  const sql = await getSql();
  await sql`delete from balances where user_id = ${userId} and mode = 'paper'`;
  for (const b of seedPaperInventory()) {
    await sql`
      insert into balances (user_id, mode, venue, asset, free, locked)
      values (${userId}, 'paper', ${b.venue}, ${b.asset}, ${moneyStr(b.free, 12)}::numeric, 0)
    `;
  }
  await sql`
    insert into system_events (user_id, kind, message)
    values (${userId}, 'reset', 'Paper inventory reset to defaults.')
  `;
}
