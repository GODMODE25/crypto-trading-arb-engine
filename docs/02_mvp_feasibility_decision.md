# EdgePilot MVP Feasibility Decision (Phase B)

**Date:** 2026-09-30  
**Rule applied:** Prefer paper-tradable, spot-only, inventory-based, same-venue or pre-funded two-venue methods. Do not assume transfers. Do not implement live DEX execution. Do not add strategies because they sound profitable.

---

## Included in MVP

### Strategy 1 — Multi-CEX inventory spread monitor + paper trader

- Venues: **Binance Spot** and **Bybit Spot**.
- Pairs (allow-list): `BTC/USDT`, `ETH/USDT`, `SOL/USDT`.
- Price: executable volume-weighted bid/ask through documented depth, **not mid**.
- Costs: configured taker fees + uncertainty buffer `C_fixed`.
- Inventory model: both venues already hold quote and base. **No transfers.**
- Paper: simulated buy on the cheap venue, sell on the rich venue, reconcile per-venue balances.
- Live: **disabled by default**; even when the global live gate is later enabled, this strategy’s `live_enabled` stays false until the owner flips it.

### Strategy 2 — Intra-CEX triangular arbitrage scanner + paper trader

- Venue: **Binance Spot only** (largest documented spot triangle surface).
- Quote asset: `USDT`.
- Discover triangles from a curated market set (USDT, BTC, ETH and the allow-list) using min-notional, precision, and book depth.
- Three sequential legs, fees, impact, min sizes.
- Signal only if final quote > start quote after buffer.
- Paper first. Live remains off.

### Strategy 3 — CEX/DEX discrepancy monitor (research-only)

- Compare Binance executable price vs a DEX quote adapter.
- Default DEX source in this build: **fixture / research quote** plus optional public comparison price. 1inch and Uniswap Trading API require owner API keys and are behind the same interface.
- Persist: timestamp, chain, token addresses, route if known, gas estimate if known, expected output, price impact, quote age.
- UI label: **MONITORING ONLY — not executable**.
- No swap, no approval, no wallet signing.

### Operator console

- Private dashboard (authenticated).
- Paper and live ledgers **never mixed**.
- Kill switch, risk events, config audit, UTC clocks.
- Demo fixture suite that produces the six required research cases.

### Optional Strategy 4 — liquid-spot momentum/mean-reversion

**Not included.** Strategies 1–3 plus the fixture suite already generate diverse accept/reject activity (fee-negative, valid paper, insufficient depth, stale, risk-limit, triangle-after-fees). A directional strategy would add discretionary risk without improving the MVP’s research loop.

---

## Excluded

- Live DEX swaps, token approvals, private-key wallets, MEV relays.
- Cross-venue transfers, deposits, withdrawals, bridging.
- Leverage, margin, futures, options, borrow, liquidation.
- OKX and KuCoin adapters (interfaces reserved).
- Solana/Raydium.
- Kelly sizing, “optimal” leverage, signal selling, copy trading, multi-tenant SaaS.
- Automatic flattening of positions on kill switch (forced market-close is a separate, explicit future option because it can lock in losses).
- Redis-backed job bus (scan is request-driven in this hosted environment).

---

## Why these choices

| Choice | Why |
|---|---|
| Binance + Bybit | Official public books, WS, testnet/demo, deep BTC/ETH/SOL USDT books. |
| Inventory spread, not transfer arb | Transfers are slow, halt-prone, and non-atomic. Modest capital cannot assume float. |
| Binance triangles only | One fee schedule, one clock, one precision table. Cross-exchange triangles are not triangles. |
| DEX monitor, not execute | Quote APIs need keys; execution adds MEV/gas/approval. Research value remains. |
| Spot only | No liquidation. Capital preservation first. |
| Paper default | The system must collect expected-vs-realized **without** putting capital in the way. |
| No Strategy 4 | Avoids fake “edge” from unvalidated directional rules. |

---

## Risks that remain after controls

- **One-legged fills** if live two-venue orders are ever enabled.
- **Fee mis-specification** if the owner’s VIP tier differs from config.
- **Stale or gapped books** during incidents.
- **Demo/testnet vs production host mix-ups** (mitigated by refusing live unless every gate passes).
- **Jurisdiction / account bans** making an adapter suddenly unusable.
- **Paper overfit**: simulated fills are optimistic vs live queue position.
- **Operator error**: enabling live with oversized limits. Defaults are tiny.

None of these are eliminated. They are logged, gated, and visible.

---

## Live capability at delivery

Live **order placement is implemented as a gated adapter** that:

- refuses unless **all 13 live-safety conditions** are true;
- supports spot limit/market **placeholders** against Binance/Bybit signed REST;
- **defaults every condition to false**;
- never withdraws, never transfers, never touches DEX.

At delivery, a freshly deployed instance **cannot place a live order**. Paper trading is fully operational.

## What remains paper-only

- All three strategies’ execution paths, until the owner explicitly satisfies the live gate **and** per-strategy `live_enabled`.
- DEX discrepancy (permanently research-only in MVP).
- Any cross-venue inventory rebalance.

---

## Stack note (environment)

This repository is the **operator console and research engine** that runs in the hosted preview/deploy environment (TypeScript, Postgres). A portable Python formula package lives in `python/` with matching Decimal tests so a later Linux VPS worker can reuse the same math. Docker Compose documents a self-host path. The product contract is identical: paper first, live gated, capital preservation first.
