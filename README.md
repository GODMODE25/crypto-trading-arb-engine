# EdgePilot

Private research desk for crypto **paper trading**, market-data monitoring, and **strictly gated** live spot trading.

It is a single-owner tool. It is not a fund, SaaS, signal service, or copy-trading product.

## What it does

- Watches Binance and Bybit spot books (public REST) for BTC/USDT, ETH/USDT, SOL/USDT.
- Measures **executable** bid/ask (volume-weighted through depth), not mid-price fiction.
- Paper-trades inventory-based cross-venue spreads and Binance USDT triangles after fees and a buffer.
- Records CEX vs DEX quote discrepancies as **MONITORING ONLY**.
- Tracks expected vs realized paper fills, per-venue simulated inventory, and an audit log.
- Exposes a kill switch that stops new orders.

## What it does not do

- Guarantee profit, income, or “risk-free arbitrage.”
- Move funds, withdraw, deposit, bridge, or transfer.
- Use leverage, futures, margin, or borrowing.
- Execute DEX swaps in this version.
- Place a live CEX order unless **every** live safety gate is true — and even then MVP live HTTP placement stays disarmed.

**Disclaimer:** You can lose money. Paper results are simulated and are not live performance. Past scans do not predict future results.

## Architecture (summary)

Public REST books → normalized snapshots → strategy modules → risk engine → paper broker (default) or live broker (gated, disarmed) → orders/fills → paper vs live ledgers → dashboard, JSON logs, optional Telegram.

Design docs: `docs/01_research_report.md` through `docs/09_owner_checklist.md`.

This operator console is a TypeScript web app (preview/deploy). Matching Decimal formulas also live in `python/` for a later VPS worker. Docker Compose documents self-hosting.

## Fast local start (hosted preview)

The desk starts itself in this environment. Default mode is **PAPER**. The first load seeds inventory and runs the fixture suite.

## Paper-mode demo

1. Open Overview.
2. Confirm the badge reads **PAPER**.
3. Press **Run fixture suite** to inject six canonical cases (fee-negative, valid paper, thin book, stale, risk-limit, triangle-after-fees).
4. Optional: **Scan public books** to pull live Binance/Bybit depth (research only; usually fee-negative).

## Tests

```text
npm test
node --experimental-strip-types --test src/lib/edgepilot/money.test.ts
PYTHONPATH=python/src python3 -m pytest python/tests -q
```

## Dashboard

Authenticated owner console:

Overview · Strategies · Signals · Paper book · Live book · Orders · PnL · Risk · Config · Health · Emergency

All clocks are UTC. Paper and live numbers are never shown as the same series.

## Configuration

Conservative defaults are in `configs/default.yaml` and `src/lib/edgepilot/config.ts`. Live confirmation phrase is never displayed. Secrets are environment-only in self-host; this hosted app does not write `.env` files.

## Exchange API credentials (safety)

1. Spot read + trade only.
2. Withdrawal **off**. Internal/universal transfer **off**. Futures **off**.
3. IP allowlist.
4. Never paste keys into chat or commit them.
5. Dashboard shows configured/not configured only.

## Add a market

Extend `DEFAULT_PAIRS` / `VENUE_SYMBOL` in `src/lib/edgepilot/types.ts` and `adapters/normalize.ts`, then add tick/step/min-notional in metadata if you tighten precision checks.

## Add an exchange adapter

Implement `fetchVenueBook` for a new `VenueId`. Prefer official REST. Do not scrape. Keep secrets out of logs (`redactSecrets`).

## Add a strategy

Pure function under `src/lib/edgepilot/strategies/`. Return a `Signal` with reasons, expected profit/ROI, and timestamps. Never call HTTP from the strategy. Register the id in `repo.server.ts` `STRATEGIES`. Add unit tests.

## How live trading is gated

All of the following must be true: `APP_MODE=live`, `LIVE_TRADING_ENABLED`, strategy live flag, exchange trading flag, API key present, **no withdrawal permission**, max order notional set, max daily loss set, risk engine healthy, fresh data, clock sync, confirmation phrase `I_UNDERSTAND_LIVE_TRADING_CAN_LOSE_MONEY`, kill switch off.

MVP still **does not send** a live HTTP order (`mvp_live_execution_not_armed`).

## Disable all trading immediately

Emergency → **Disable new trading**, or set kill switch on. New signals will not become orders. Positions are **not** market-closed by default.

## Known limitations

- Request-driven scans (no always-on WebSocket worker in this host).
- Paper fills are optimistic vs live queue position.
- Fee tiers must be configured; defaults are conservative 10 bps taker.
- DEX quotes are fixtures unless a 1inch key is added later.
- OKX/KuCoin adapters are not shipped.
- Preview database is in-memory and resets on process restart.

See `docs/09_owner_checklist.md` before considering live capital.
