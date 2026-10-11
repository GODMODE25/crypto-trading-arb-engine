# EdgePilot Architecture (Phase C)

## Design principles

1. Strategy code never calls exchange HTTP/WS directly.
2. Adapters normalize symbols, timestamps (UTC ms), books, and fees.
3. Paper and live ledgers are separate tables/columns (`mode`).
4. Every state change is an append-only audit row.
5. Decimal string arithmetic for all money.
6. Live is impossible unless every safety gate is true.
7. Fail closed: missing data, stale books, invalid math → no order.

## Data flow

```text
Public REST market data (Binance, Bybit)
        │
        ▼
  MarketDataProvider  ──normalize──►  BookSnapshot / Ticker
        │
        ▼
  Strategy engine (spread | triangle | dex-monitor)
        │
        ▼
  Opportunity / Signal  (expected PnL, ROI, reasons, timestamps)
        │
        ▼
  RiskManager  (global, strategy, venue, asset, order, staleness, kill switch)
        │
        ├── reject ──► risk_events + alerts
        │
        ▼
  Execution router
        ├── mode=paper ──► PaperBroker ──► simulated fills
        └── mode=live  ──► LiveBroker (all gates) ──► exchange (spot only)
        │
        ▼
  Order / fill tracking
        │
        ▼
  PortfolioService (per-venue balances, MTM in USDT, realized vs unrealized)
        │
        ▼
  Persistence + JSON logs + metrics + Telegram + dashboard
```

## Runtime in this environment

Long-lived WebSocket workers are not available on the serverless deploy target. Market data is fetched on a **scan tick** (dashboard poll or “Run scan”). Adapters still implement reconnect/backoff **interfaces** so a VPS worker can swap in WS later. REST is the documented official fallback on both Binance and Bybit.

## Module map

| Module | Responsibility |
|---|---|
| `domain` | Money, books, signals, orders. No I/O. |
| `adapters/cex` | Binance, Bybit REST. |
| `adapters/dex` | Quote provider interface + fixture + optional HTTP. |
| `market_data` | Fetch, normalize, staleness stamp, persist snapshots. |
| `strategies` | Pure decision functions + typed config. |
| `risk` | Limits, live gate, kill switch. |
| `execution` | PaperBroker, LiveBroker, router. |
| `portfolio` | Balances, MTM, PnL. |
| `persistence` | SQL repositories scoped by `user_id`. |
| `notifications` | Telegram + in-app alert log, dedup. |
| `dashboard` | Owner UI. |
| `api` | Health, ready, metrics, scan. |

## Core interfaces

### MarketDataProvider

```ts
interface MarketDataProvider {
  id: VenueId;
  fetchBook(symbol: CanonicalSymbol): Promise<BookSnapshot>;
  fetchTicker(symbol: CanonicalSymbol): Promise<TickerSnapshot>;
  fetchMarkets(): Promise<MarketMeta[]>;
}
```

### ExchangeAdapter extends MarketDataProvider

```ts
interface ExchangeAdapter extends MarketDataProvider {
  placeOrder(req: NormalizedOrderRequest): Promise<NormalizedOrder>;
  cancelOrder(id: string, symbol: CanonicalSymbol): Promise<void>;
  fetchBalances(): Promise<Balance[]>;
  supportsTrading: boolean;
}
```

Live methods throw unless the live gate passed **and** the adapter is the live broker.

### DexQuoteProvider

```ts
interface DexQuoteProvider {
  id: string;
  quote(req: DexQuoteRequest): Promise<DexQuote>; // estimated, non-executable
}
```

### Strategy

```ts
interface Strategy {
  id: string;
  name: string;
  evaluate(ctx: StrategyContext): Promise<Signal[]>;
}
```

### RiskManager

```ts
interface RiskManager {
  review(signal: Signal, ctx: RiskContext): RiskDecision; // allow | reject
  liveGate(): LiveGateResult; // every condition named
}
```

### ExecutionEngine / PaperBroker / LiveBroker

```ts
interface Broker {
  mode: "paper" | "live";
  submit(order: Intent): Promise<OrderResult>;
}
```

### PortfolioService

Mark-to-market in USDT. Separate paper vs live. Fees reduce realized PnL.

### NotificationService

`notify(event)` with `dedupKey` + cooldown. Never includes secrets.

### Repository

All queries `WHERE user_id = $verified`.

## Modes

| Mode | Meaning |
|---|---|
| `PAPER` | Default. Signals may become paper orders. |
| `LIVE DISABLED` | App mode live but `LIVE_TRADING_ENABLED` false or gate incomplete. |
| `LIVE ENABLED` | Every live condition true. Still per-strategy. |

Displayed in the top bar at all times.

## Clock

All stored timestamps are UTC. Dashboard displays UTC. Staleness = `now_utc - snapshot.exchange_ts`.
