# EdgePilot Research Report (Phase A)

**Product:** EdgePilot — private, single-owner crypto market-research, paper-trading, and gated live-trading console.

**Research date:** 2026-09-30.

**Method:** Official documentation, official GitHub repositories, and well-maintained open-source project docs only. Capabilities that could not be verified from those sources are marked **uncertain**.

**Disclaimer:** Nothing in this report is investment advice. Apparent spreads are not executable profit. No strategy is claimed to produce income.

---

## A. Centralized exchange connectivity

### A.1 Binance Spot

**Sources**

- Official Spot API GitHub: [https://github.com/binance/binance-spot-api-docs](https://github.com/binance/binance-spot-api-docs)
- REST: [https://github.com/binance/binance-spot-api-docs/blob/master/rest-api.md](https://github.com/binance/binance-spot-api-docs/blob/master/rest-api.md)
- WebSocket streams: [https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md](https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md)
- WebSocket API: [https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-api.md](https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-api.md)
- Testnet general info: [https://developers.binance.com/docs/binance-spot-api-docs/testnet/general-info](https://developers.binance.com/docs/binance-spot-api-docs/testnet/general-info)
- Demo Mode: [https://developers.binance.com/docs/binance-spot-api-docs/demo-mode/general-info](https://developers.binance.com/docs/binance-spot-api-docs/demo-mode/general-info)
- API key restrictions endpoint: [https://developers.binance.com/docs/wallet/account/api-key-permission](https://developers.binance.com/docs/wallet/account/api-key-permission)

| Capability | Finding |
|---|---|
| Public market-data REST | Yes. Security type `NONE` for depth, ticker, exchangeInfo. REST base `https://api.binance.com/api` (and `api1`–`api4`, `api-gcp`). |
| WebSocket market data | Yes. `wss://stream.binance.com:9443/ws` and combined stream. Depth, bookTicker, trades, klines. |
| Authenticated trading | Yes. `TRADE` (orders), `USER_DATA` (account/orders), `USER_STREAM`. HMAC-signed. |
| Testnet / demo / paper | **Spot Test Network:** `https://testnet.binance.vision/api`, streams `wss://stream.testnet.binance.vision`. Virtual funds, independent book. **Demo Mode:** `https://demo-api.binance.com/api`, books similar to live. Keys are not interchangeable. |
| Spot markets | Yes. BTCUSDT, ETHUSDT, SOLUSDT and a large universe. |
| Order book | REST `GET /api/v3/depth`. Streams `depth` / `depth@100ms`. |
| Rate limits | Weight-based (`REQUEST_WEIGHT`, `ORDERS`, `RAW_REQUESTS`) published in `/api/v3/exchangeInfo`. Repeated 429s can escalate to HTTP 418 IP ban. Exact current weights are **live-data**, not hardcoded. |
| API-key permissions | Keys default without `TRADE`. `enableSpotAndMarginTrading` required for live spot. `enableWithdrawals` is a separate flag and **must remain false**. Query via `GET /sapi/v1/account/apiRestrictions`. IP restriction is supported and required by Binance before withdrawals can even be enabled. |
| Fee data | Account commission endpoints exist (`USER_DATA`). Public default spot taker is commonly 0.10% for unconfigured VIP; **actual fee is account-specific and must be configured or fetched, never assumed as a constant in live mode**. |
| Withdrawal/deposit | Wallet `/sapi` endpoints exist. EdgePilot **must never call them**. |
| Geographic / account | Binance restricts products by jurisdiction. US persons and some other regions cannot use Binance.com. **Owner must confirm local access independently.** Uncertain for any specific country without the owner’s account. |
| Suitability | (1) Market-data monitoring: **yes**. (2) Paper: **yes** via internal paper broker + optional testnet/demo. (3) Live spot: **yes, with gated keys, no withdrawal permission**. |

### A.2 Bybit V5 Spot

**Sources**

- V5 docs hub: [https://bybit-exchange.github.io/docs/v5/intro](https://bybit-exchange.github.io/docs/v5/intro)
- Order book REST: [https://bybit-exchange.github.io/docs/v5/market/orderbook](https://bybit-exchange.github.io/docs/v5/market/orderbook)
- WebSocket connect: [https://bybit-exchange.github.io/docs/v5/ws/connect](https://bybit-exchange.github.io/docs/v5/ws/connect)
- Public orderbook stream: [https://bybit-exchange.github.io/docs/v5/websocket/public/orderbook](https://bybit-exchange.github.io/docs/v5/websocket/public/orderbook)
- Rate limits: [https://bybit-exchange.github.io/docs/v5/rate-limit](https://bybit-exchange.github.io/docs/v5/rate-limit)

| Capability | Finding |
|---|---|
| Public market-data REST | Yes. `GET /v5/market/orderbook`, tickers, instruments. Host `https://api.bybit.com`. Testnet `https://api-testnet.bybit.com`. |
| WebSocket market data | Yes. Spot public: `wss://stream.bybit.com/v5/public/spot`. Topic `orderbook.{depth}.{symbol}`. Heartbeat recommended ~20s. |
| Authenticated trading | Yes. V5 trade endpoints (`POST /v5/order/create`, amend, cancel). HMAC. Unified Trading Account. |
| Testnet / demo | Testnet host documented. Demo trading host `api-demo.bybit.com` is documented in third-party comparisons; **demo vs testnet key mismatch is a known operational hazard**. Use testnet for integration, paper broker for research. |
| Spot markets | Yes. `category=spot`, symbols `BTCUSDT`, `ETHUSDT`, `SOLUSDT`. |
| Order book | REST snapshot up to 1000 levels spot. WS depths 1/50/200/1000. |
| Rate limits | HTTP IP: **600 requests / 5 seconds / IP** (documented). WS: do not exceed 500 connections / 5 minutes. Spot order create default **20/s** UID (VIP table). `retCode 10006` = too many visits. |
| API-key permissions | Keys can be scoped read / trade. Withdrawal is a separate permission and must stay off. IP allowlisting is supported. |
| Fee data | Fee-rate endpoints exist for authenticated accounts. Unauthenticated research must use **configured conservative taker fees**. |
| Geographic | Bybit has regional sites (`.kz`, `.tr`, etc.) and product restrictions. **Owner must confirm account venue.** |
| Suitability | (1) Monitoring: **yes**. (2) Paper: **yes**. (3) Live spot: **yes, gated**. Strong second venue for inventory-based spread research. |

### A.3 OKX V5 Spot

**Sources**

- Official V5: [https://www.okx.com/docs-v5/en/](https://www.okx.com/docs-v5/en/)
- Demo trading: same REST host with `x-simulated-trading: 1`; WS demo `wss://wspap.okx.com:8443/ws/v5/public` (documented in official demo section)

| Capability | Finding |
|---|---|
| Public REST | Yes. `GET /api/v5/market/books`, tickers. Spot instIds `BTC-USDT`. |
| WebSocket | Yes. Public `wss://ws.okx.com:8443/ws/v5/public`. Connection limit 3 req/s IP; 480 subscribe/login/hour/connection. |
| Authenticated trading | Yes. Signed headers `OK-ACCESS-*`. |
| Demo | Yes. Demo keys + `x-simulated-trading: 1`. **Mixing a demo key with production (missing header) is a documented class of error (`50101`).** |
| Order book | `GET /api/v5/market/books`, rate limit 40/2s IP (official endpoint page). |
| Suitability | Excellent product, but demo/live header mixing is a live-risk. **Deferred from MVP adapters** in favor of Binance + Bybit. Kept as a future adapter. |

### A.4 KuCoin

**Sources**

- New docs: [https://www.kucoin.com/docs-new/introduction](https://www.kucoin.com/docs-new/introduction)
- WebSocket intro: [https://www.kucoin.com/docs-new/websocket-api/introduction](https://www.kucoin.com/docs-new/websocket-api/introduction)
- Rate limits: [https://www.kucoin.com/docs-new/rate-limit](https://www.kucoin.com/docs-new/rate-limit)

| Capability | Finding |
|---|---|
| Public REST | Yes. `https://api.kucoin.com`. |
| WebSocket | Requires a **REST token bootstrap** before connecting. Token valid 24h. Public push hosts documented (`wss://x-push-spot.kucoin.com` in UTA intro). Classic vs UTA (V1/V2) split increases adapter complexity. |
| Sandbox | Historical sandbox has been **unreliable / deprecated** in community reports; current official sandbox status is **uncertain** from the pages retrieved. Do not depend on it. |
| Suitability | Viable later. **Rejected for MVP** due to token-gated WS, Classic/UTA split, and sandbox uncertainty. |

---

## B. DEX and on-chain connectivity

### B.1 Uniswap (EVM)

**Sources**

- Trading API: [https://docs.uniswap.org/api/trading/overview](https://docs.uniswap.org/api/trading/overview)
- QuoterV2: [https://docs.uniswap.org/contracts/v3/reference/periphery/interfaces/IQuoterV2](https://docs.uniswap.org/contracts/v3/reference/periphery/interfaces/IQuoterV2)
- SDK quoting guide: [https://docs.uniswap.org/sdk/v3/guides/swaps/quoting](https://docs.uniswap.org/sdk/v3/guides/swaps/quoting)

How quotes are obtained:

1. **Off-chain Trading API** `POST https://trade-api.gateway.uniswap.org/v1/quote` — requires API key (`x-api-key`). Returns route, gas, and encoded swap. Owner-managed key.
2. **On-chain QuoterV2** `quoteExactInput` / `quoteExactInputSingle` — not `view`; simulates a swap and reverts with the result. Needs a reliable Ethereum (or L2) RPC. Returns `amountOut`, `gasEstimate`, post-swap sqrt price.

Price impact: QuoterV2’s `sqrtPriceX96After` vs current pool price can be converted to impact. Trading API may include impact/gasless routing. **Not atomic with any CEX.**

Gas: `gasEstimate` × current gas price × ETH/quote. Highly variable. L2s cheaper but still not free and still not atomic with CEX.

Token approval: ERC-20 `approve` or Permit2 (`0x000000000022D473030F116dDEE9F6B43aC78BA3` on most chains per Uniswap FAQ). First-time approval is a separate on-chain tx and a capital-lock / phishing surface.

RPC: A private RPC is required for production quoting. Public RPCs rate-limit and can return stale state.

MEV: Public mempool swaps are sandwichable. Private relays (e.g. Flashbots) reduce but do not eliminate risk and add extra failure modes. **Uncertain** which relay the owner can use.

Finality: Ethereum ~12s block, economic finality longer. L2s vary; reorgs and sequencer downtime exist.

### B.2 1inch Classic Swap API

**Sources**

- Portal / classic swap: [https://portal.1inch.dev/documentation/apis/swap/classic-swap/quick-start](https://portal.1inch.dev/documentation/apis/swap/classic-swap/quick-start)
- Quote method: [https://business.1inch.com/portal/documentation/apis/swap/classic-swap/methods/v6.1/1/quote/method/get](https://business.1inch.com/portal/documentation/apis/swap/classic-swap/methods/v6.1/1/quote/method/get)
- Business FAQ: [https://business.1inch.com/products/swap](https://business.1inch.com/products/swap)

- Quote: `GET https://api.1inch.com/swap/v6.1/{chainId}/quote` with Bearer API key.
- Response includes `dstAmount`, optional `gas`, protocols used. Price impact field is not guaranteed on every version — treat as **estimated**.
- API key required. Dev plan documented as 100,000 calls/month, 60 rpm (business page). **KYC/KYB may be required** to obtain a key — owner action.
- Swap calldata is a separate `/swap` call. Approvals still required.

**MVP decision:** adapter interface + fixture provider. Live 1inch quoting only if the owner later supplies a key. No DEX swap execution in MVP.

### B.3 PancakeSwap / Raydium

- PancakeSwap is Uniswap-v2/v3-like on BNB Chain. Additional RPC and router addresses. Not needed if 1inch/Uniswap cover research quotes.
- Raydium (Solana) requires a second VM, different transaction model, different finality. **Rejected for MVP** as not reasonably maintainable alongside EVM quoting.

### B.4 Why CEX–DEX “arbitrage” is usually not profit

Displayed CEX mid vs DEX mid ignores: bid/ask, depth, CEX taker fee, DEX LP fee, gas, price impact, block latency, MEV, deposit/withdrawal time, bridging, inventory, and the fact that the two legs **cannot be atomic**. By the time a CEX fill is acknowledged, the DEX quote is a different block. Withdrawal + deposit of the base asset can take minutes to hours and can be halted. This is **research signal**, not an execution strategy, until a separately designed inventory + private-relay system exists.

---

## C. Libraries and infrastructure

| Component | Finding | MVP use |
|---|---|---|
| [CCXT](https://github.com/ccxt/ccxt) / [docs.ccxt.com](https://docs.ccxt.com) | Unified REST (+ WS in the same modern package) for 100+ venues. Python, JS/TS. Rate-limit helpers. | **Approved as optional adapter layer.** EdgePilot uses thin native REST adapters for Binance and Bybit so market-data shapes and timestamps stay explicit. CCXT is documented as the path to add OKX later. |
| Official SDKs | Binance connector, `pybit`, `python-okx`. | Native REST is enough for spot public data. |
| [web3.py](https://web3py.readthedocs.io/) | Standard EVM client. | Interface placeholder for future QuoterV2. Not required for MVP monitoring-only DEX. |
| PostgreSQL | Durable audit trail. | Yes (Neon in deploy, PGLite in preview). |
| Redis | Useful for locks/queues. | **Not in MVP.** Scan is request-driven; Postgres is the source of truth. Revisit if a long-running VPS worker is added. |
| FastAPI | Excellent for a VPS worker API. | Portable Python formula package is provided. The operator console that actually runs in this environment is the TypeScript app (preview/deploy contract). |
| SQLAlchemy / Alembic | Python ORM/migrations. | SQL migrations in `migrations/` for the running app. |
| Docker Compose | Standard VPS packaging. | Provided. |
| Prometheus | `/metrics` text exposition. | Lightweight `/api/metrics` endpoint. |
| [Telegram Bot API](https://core.telegram.org/bots/api) | `https://api.telegram.org/bot<token>/sendMessage`. | Optional. Token + chat id configured by owner. Deduped alerts. Never logged. |
| Secrets | Single-owner VPS: env vars + file permissions. This hosted app: platform-injected env; **never commit keys; never persist withdrawal-capable keys; never log secrets.** | Owner-supplied keys stay in env / encrypted-at-rest config placeholders. Dashboard shows only “configured / not configured”. |

**Arithmetic:** Python `decimal.Decimal` and JS `decimal.js`. Never IEEE-754 for money.

---

## D. Execution and risk reality

Apparent arbitrage dies in:

1. **Maker/taker fees.** 0.10% per leg × 2 = 0.20% before any edge.
2. **Bid/ask.** Mid-price “spread” is fiction. Executable price is volume-weighted through the book.
3. **Depth / partial fills.** Thin books gap; market orders walk the book.
4. **Latency.** Two REST round-trips are not simultaneous.
5. **Gas, withdrawal fees, transfer delay, bridge risk, stale data.**
6. **Non-atomicity.** Cross-exchange and CEX–DEX legs can fill one side only (“legged risk”).

| Method | Atomic? | Inventory assumption | MVP |
|---|---|---|---|
| 1. Same-exchange triangular | Same venue, still three sequential orders | Quote currency on one venue | **Paper scanner + paper trader.** Live remains gated/off. |
| 2. Cross-CEX inventory spread | No | Pre-funded base + quote on **both** venues | **Paper.** Live gated/off. No transfers. |
| 3. CEX–DEX price monitoring | n/a | n/a | **Research-only.** |
| 4. CEX–DEX execution | No | Wallet + CEX balances + gas | **Not implemented.** |

Modest-capital realistic methods: paper-test (1) and (2) with conservative fees and buffers; treat (3) as a data-collection lab.

---

## Shortlist of viable integrations

1. **Binance Spot** — primary market-data + triangular universe + optional live spot (gated).
2. **Bybit Spot V5** — second venue for inventory spread.
3. **Internal paper broker** — deterministic, first-class.
4. **DEX quote adapter (interface)** — fixtures now; optional 1inch/Uniswap later.
5. **Telegram Bot API** — owner alerts, optional.
6. **CCXT** — future third venue, not required to ship.

## Rejected integrations (MVP)

| Integration | Why |
|---|---|
| OKX live adapter | Demo/live header footgun; deferred. |
| KuCoin | WS token bootstrap + Classic/UTA split + sandbox uncertainty. |
| Live DEX swaps | Keyed APIs, approvals, gas, MEV, non-atomic vs CEX. |
| Raydium / Solana | Second runtime; maintainability. |
| PancakeSwap direct | Redundant with aggregator/Uniswap path. |
| Futures / margin / leverage / borrow | Explicitly out of scope; liquidation risk. |
| Auto withdraw / deposit / bridge / transfer | Capital-extraction and non-atomic inventory risk. |
| Redis | Unnecessary for request-driven MVP. |
| Scraping websites | Terms/ToS and brittleness. |

## Uncertainties (geographic, compliance, operational, API)

- Whether the owner’s jurisdiction may use Binance.com or Bybit, and which regional hostname applies.
- Account-specific fee tiers (VIP), rebate, and BNB/discount flags.
- 1inch key issuance (KYC/KYB) and current quote schema fields.
- Uniswap Trading API key terms.
- Exact Binance weight table at runtime (must be read from `exchangeInfo`).
- Clock drift on the host vs exchange (live gate requires a drift check).
- Whether exchange IP allowlists can include the eventual VPS address.
- Tax lot accounting: **out of scope**; owner is responsible for local tax treatment.
- Legal classification of automated trading in the owner’s country: **owner must confirm**.

## What the owner must configure before any live trading

1. Create **spot-trade-only** API keys. **Never enable withdrawals, internal transfer, universal transfer, futures, or margin.**
2. Enable **IP allowlisting** on those keys.
3. Confirm the account’s **actual taker/maker fees**.
4. Pre-fund inventory on each venue that a strategy may touch. EdgePilot will not move funds.
5. Leave `APP_MODE=paper` until paper results are reviewed.
6. Set conservative `max_order_notional`, `max_daily_loss`, `max_drawdown_pct`.
7. Set the live-confirmation phrase only after the above.
8. Confirm local access, tax, and platform rules.
9. Test the kill switch in paper.
10. Configure Telegram (optional) with a bot token that is **not** committed to git.

See [09_owner_checklist.md](./09_owner_checklist.md).
