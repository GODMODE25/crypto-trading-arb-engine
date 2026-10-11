# EdgePilot Data Model

All tables include `user_id TEXT NOT NULL` (Better Auth id). Monetary columns are `NUMERIC` (Postgres) / `TEXT` of Decimal in application code. Timestamps are `TIMESTAMPTZ` UTC.

Paper vs live: `mode TEXT NOT NULL CHECK (mode IN ('paper','live'))` on orders, fills, positions, balances, pnl.

## Tables

| Table | Purpose |
|---|---|
| `strategies` | Registered modules (spread, triangle, dex_monitor). |
| `strategy_configs` | JSON/typed knobs + `live_enabled`, `paused`. |
| `exchanges` | `binance`, `bybit` metadata. |
| `exchange_accounts` | Per-venue flags (`trading_enabled`, `key_configured`, `withdrawal_permission_declared`). **No raw secrets.** |
| `markets` | Canonical `BTC/USDT` ↔ venue symbol. |
| `market_metadata` | Tick, step, min qty, min notional, status. |
| `price_snapshots` | Bid/ask/last + ts. |
| `orderbook_snapshots` | Summarized top-N levels JSON + ts. |
| `signals` | Strategy outputs, including rejects. |
| `opportunities` | Normalized edge records (expected profit/ROI). |
| `orders` | Paper or live order lifecycle. |
| `fills` | Partial/full fills, fees. |
| `positions` | Open inventory per venue/asset/mode. |
| `balances` | Per venue, asset, mode. |
| `transfers` | Manual annotations only; system never creates live transfers. |
| `portfolio_snapshots` | Equity MTM. |
| `pnl_records` | Realized/unrealized, estimated vs realized, daily. |
| `risk_events` | Limit hits, gate failures. |
| `system_events` | Start/stop, scan, errors. |
| `alert_logs` | Telegram/in-app, dedup key. |
| `config_audit_logs` | Who/what/when (user_id, field, old, new). |
| `system_state` | Kill switch, consecutive errors, last scan, mode. |

## Indexes

- `(user_id, ts)` on snapshots, signals, opportunities, orders, risk_events, system_events
- `(user_id, exchange, market)` on snapshots and markets
- `(user_id, strategy_id, status)` on signals
- `(user_id, status)` on orders
- `(user_id, mode)` on balances, pnl, orders

## Retention

Preview DB is in-memory and resets on process restart. Deployed Neon retains until the owner deletes. Snapshot tables may grow; scans store **summarized** books (top 20 levels), not full 1000-level dumps.
