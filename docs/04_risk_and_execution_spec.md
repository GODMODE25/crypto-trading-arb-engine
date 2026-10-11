# EdgePilot Risk and Execution Specification

Capital protection outranks expected edge. If a formula is undefined, the system does not trade.

All money is `Decimal`. Division by zero, negative quantities, and non-finite values are rejects.

---

## A. Global defaults

| Knob | Default | Why |
|---|---|---|
| `app_mode` | `paper` | No live orders. |
| `live_trading_enabled` | `false` | Dual control with app_mode. |
| `spot_only` | `true` | No leverage. |
| `allow_transfers` | `false` | No auto capital movement. |
| `quote_ccy` | `USDT` | Single MTM currency. |
| `max_global_live_notional` | `250` USDT | Tiny until proven. |
| `max_strategy_notional` | `150` USDT | |
| `max_asset_exposure` | `200` USDT | |
| `max_order_notional` | `75` USDT | Caps a single mistake. |
| `max_daily_loss_abs` | `25` USDT | Absolute halt. |
| `max_daily_loss_pct` | `2` | Of paper/live equity. |
| `max_drawdown_pct` | `8` | Rolling from peak equity. |
| `max_consecutive_errors` | `5` | Then auto kill-switch. |
| `max_stale_ms` | `5000` | Books older than this cannot generate executable signals. |
| `max_book_age_ms` | `5000` | Same for depth. |
| `max_clock_drift_ms` | `1000` | Live gate. |
| `max_open_orders` | `4` | |
| `max_concurrent_positions` | `4` | |
| `cooldown_after_breach_s` | `900` | 15 minutes. |
| `taker_fee_binance` | `0.001` | Conservative 10 bps until owner sets actual. |
| `taker_fee_bybit` | `0.001` | Same. |
| `uncertainty_buffer_usdt` | `0.50` | `C_fixed`. |
| `min_net_profit_usdt` | `0.25` | Do not trade dust. |
| `min_net_roi` | `0.0005` | 5 bps after all costs. |
| `max_slippage_bps` | `15` | |
| `kill_switch` | `false` (off) | Explicit. |
| `live_confirmation_phrase` | unset | Must equal `I_UNDERSTAND_LIVE_TRADING_CAN_LOSE_MONEY`. |
| `flatten_on_kill` | `false` | Forced close can worsen losses. |

Paper starting inventory (simulated, per venue): `10000 USDT`, `0.15 BTC`, `2.0 ETH`, `20 SOL`.

---

## B. Live-trading safety gate

Live order placement requires **ALL**:

1. `APP_MODE=live`
2. `LIVE_TRADING_ENABLED=true`
3. Strategy `live_enabled=true`
4. Exchange `trading_enabled=true`
5. API key present (env, never logged)
6. Key has **no withdrawal permission** (declared + optional restrictions query)
7. `max_order_notional` explicitly set and > 0
8. `max_daily_loss_abs` explicitly set and > 0
9. Risk engine healthy (not in cooldown, consecutive errors < max)
10. Market data fresh (`now - ts <= max_stale_ms`)
11. Clock sync check passes (`|local - exchange_server_time| <= max_clock_drift_ms`)
12. Live confirmation phrase matches exactly
13. Global kill-switch is **not** active

If any is false: do not send the order; persist `risk_events` with the failed condition names; alert if a live attempt was made.

---

## C. Kill switch

Triggers:

- Dashboard “Disable new trading”
- Config/env `KILL_SWITCH=true`
- Automatic: daily loss, drawdown, consecutive errors, repeated stale data

Behavior (default):

1. Stop new signals from becoming orders (paper and live).
2. Attempt cancel of open live orders if a live adapter is connected.
3. Write `system_events` + `config_audit_logs`.
4. Alert owner.

Does **not** market-close positions unless `flatten_on_kill` is explicitly true (default false).

---

## D. Formulas

### D.1 CEX–CEX inventory spread

Let  
`Q` = proposed base quantity  
`P_buy` = volume-weighted executable **ask** on the buy venue (walks asks)  
`P_sell` = volume-weighted executable **bid** on the sell venue (walks bids)  
`f_buy`, `f_sell` = taker fee rates  
`C_fixed` = buffer in quote currency  

```
GrossCost    = Q × P_buy
BuyFee       = GrossCost × f_buy
GrossProceeds= Q × P_sell
SellFee      = GrossProceeds × f_sell
NetProfit    = GrossProceeds - SellFee - GrossCost - BuyFee - C_fixed
NetROI       = NetProfit / (GrossCost + BuyFee + C_fixed)
```

Trade (paper) only if `NetProfit >= min_net_profit` **and** `NetROI >= min_net_roi`.  
`P_sell > P_buy` alone is **never** sufficient.

### D.2 Volume-weighted executable price

Walk the book levels in price-time order until `Q` is filled. If residual quantity remains, **reject** (insufficient depth). Partial last level uses that level’s price.

### D.3 Triangular arbitrage

Start with quote amount `S` in USDT.

For each of three legs:

1. Determine side (buy base vs sell base) from the pair orientation.
2. Apply precision (step size, tick size) **after** computing the raw fill, using floor for sells of base and configured rounding that never overstates output.
3. Apply venue min-notional / min-qty; reject if breached.
4. Apply book impact and fee.

Let `F` be the final USDT after three legs.  
Signal iff `F - S - C_fixed >= min_net_profit` and `(F - S - C_fixed) / S >= min_net_roi`.

### D.4 DEX monitoring

Record `amount_in`, `amount_out_est`, route, gas_est, gas_in_quote if ETH price known, price_impact, quote_ts, buffer.  
`Net` is informational. **Never routes to a broker.**

### D.5 Position sizing

`Q = min(`

- available base or quote / price on the relevant venue,
- `max_order_notional / P`,
- remaining strategy cap,
- remaining asset cap,
- largest Q with estimated slippage ≤ `max_slippage_bps`,
- largest Q fully supported by both books,
- exchange min/precision constraints
`)`

No Kelly. If `Q` below exchange minimum, skip.

### D.6 Slippage (bps)

```
slippage_bps = |vwap - top_of_book| / top_of_book × 10000
```

---

## E. Staleness and data quality — hard rejects

Do not generate executable paper or live signals if:

- any book or ticker is missing
- book age > `max_book_age_ms`
- clock drift > tolerance (live)
- fee missing and no configured fallback
- depth insufficient for Q
- market status halted/break/unknown
- any Decimal operation invalid
- kill switch on
- risk breach / cooldown

Paper **research** rows may still be stored as `rejected` signals with reasons, so the owner can see why nothing traded.
