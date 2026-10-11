import { c as floorToStep, d as moneyStr, i as ZERO, l as isPositive, n as DEFAULT_CONFIG, o as d, r as LIVE_PHRASE, s as displayMode, t as BPS, u as minD } from "./config-CVMdV5TK.mjs";
import { i as getSql } from "./db-DA8X68-y.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/repo.server-DDU2nso3.js
function sortBook(book) {
	const bids = [...book.bids].sort((a, b) => b.price.cmp(a.price));
	const asks = [...book.asks].sort((a, b) => a.price.cmp(b.price));
	return {
		...book,
		bids,
		asks
	};
}
function levelsFor(book, side) {
	const sorted = sortBook(book);
	return side === "buy" ? sorted.asks : sorted.bids;
}
/**
* Walk the book to fill `qty` of base. Buy walks asks; sell walks bids.
* Rejects if residual remains.
*/
function estimateFill(book, side, qty) {
	const q = qty;
	if (!isPositive(q)) return {
		qty: ZERO,
		vwap: ZERO,
		notional: ZERO,
		unfilled: q.abs(),
		top: ZERO,
		slippageBps: ZERO,
		sufficient: false
	};
	const levels = levelsFor(book, side);
	const top = levels[0]?.price ?? ZERO;
	let remaining = q;
	let notional = ZERO;
	let filled = ZERO;
	for (const lvl of levels) {
		if (!isPositive(lvl.qty) || !isPositive(lvl.price)) continue;
		const take = remaining.lt(lvl.qty) ? remaining : lvl.qty;
		notional = notional.add(take.mul(lvl.price));
		filled = filled.add(take);
		remaining = remaining.sub(take);
		if (remaining.lte(0)) break;
	}
	const sufficient = remaining.lte(0) && filled.gt(0);
	const vwap = filled.gt(0) ? notional.div(filled) : ZERO;
	const slippageBps = top.gt(0) && vwap.gt(0) ? vwap.sub(top).abs().div(top).mul(BPS) : ZERO;
	return {
		qty: filled,
		vwap,
		notional,
		unfilled: remaining.gt(0) ? remaining : ZERO,
		top,
		slippageBps,
		sufficient
	};
}
function serializeBook(book) {
	return {
		venue: book.venue,
		symbol: book.symbol,
		tsMs: book.tsMs,
		source: book.source,
		bids: book.bids.slice(0, 20).map((l) => ({
			price: moneyStr(l.price),
			qty: moneyStr(l.qty)
		})),
		asks: book.asks.slice(0, 20).map((l) => ({
			price: moneyStr(l.price),
			qty: moneyStr(l.qty)
		}))
	};
}
/**
* Inventory-based CEX–CEX spread.
* NetProfit = Q*P_sell*(1-f_sell) - Q*P_buy*(1+f_buy) - C_fixed
*/
function inventorySpread(input) {
	const reasons = [];
	const buyFill = estimateFill(input.buyBook, "buy", input.qty);
	const sellFill = estimateFill(input.sellBook, "sell", input.qty);
	if (!buyFill.sufficient) reasons.push("insufficient_depth_buy");
	if (!sellFill.sufficient) reasons.push("insufficient_depth_sell");
	if (buyFill.slippageBps.gt(input.maxSlippageBps)) reasons.push("slippage_buy");
	if (sellFill.slippageBps.gt(input.maxSlippageBps)) reasons.push("slippage_sell");
	const Q = input.qty;
	const P_buy = buyFill.vwap;
	const P_sell = sellFill.vwap;
	const grossCost = Q.mul(P_buy);
	const buyFee = grossCost.mul(input.fBuy);
	const grossProceeds = Q.mul(P_sell);
	const sellFee = grossProceeds.mul(input.fSell);
	const netProfit = grossProceeds.sub(sellFee).sub(grossCost).sub(buyFee).sub(input.cFixed);
	const denom = grossCost.add(buyFee).add(input.cFixed);
	const netRoi = denom.gt(0) ? netProfit.div(denom) : ZERO;
	if (P_sell.lte(P_buy)) reasons.push("sell_not_above_buy");
	if (netProfit.lt(input.minNetProfit)) reasons.push("net_profit_below_threshold");
	if (netRoi.lt(input.minNetRoi)) reasons.push("net_roi_below_threshold");
	if (!isPositive(Q) || !buyFill.sufficient || !sellFill.sufficient) reasons.push("invalid_qty");
	const tradable = reasons.length === 0 && netProfit.gte(input.minNetProfit) && netRoi.gte(input.minNetRoi);
	return {
		buyVenue: input.buyBook.venue,
		sellVenue: input.sellBook.venue,
		symbol: input.buyBook.symbol,
		qty: Q,
		pBuy: P_buy,
		pSell: P_sell,
		fBuy: input.fBuy,
		fSell: input.fSell,
		cFixed: input.cFixed,
		grossCost,
		buyFee,
		grossProceeds,
		sellFee,
		netProfit,
		netRoi,
		buySlippageBps: buyFill.slippageBps,
		sellSlippageBps: sellFill.slippageBps,
		reasons,
		tradable
	};
}
function maxQtyForNotional(notionalCap, price) {
	if (!price.gt(0)) return ZERO;
	return notionalCap.div(price);
}
function sizeSpreadQty(opts) {
	const topAsk = opts.buyBook.asks[0]?.price;
	if (!topAsk) return ZERO;
	const cap = maxQtyForNotional(opts.maxOrderNotional, topAsk);
	let q = minD(opts.want, cap);
	for (let i = 0; i < 12; i++) {
		const buy = estimateFill(opts.buyBook, "buy", q);
		const sell = estimateFill(opts.sellBook, "sell", q);
		if (buy.sufficient && sell.sufficient && buy.slippageBps.lte(opts.maxSlippageBps) && sell.slippageBps.lte(opts.maxSlippageBps)) break;
		q = q.mul(d("0.5"));
		if (q.lt(opts.minQty)) return ZERO;
	}
	if (opts.step.gt(0)) q = floorToStep(q, opts.step);
	return q.gte(opts.minQty) ? q : ZERO;
}
function applyFeeOut(amount, fee) {
	return amount.mul(d("1").sub(fee));
}
function tradePair(book, side, qtyBase, fee, symbol) {
	const fill = estimateFill(book, side, qtyBase);
	if (!fill.sufficient) return { error: `insufficient_depth_${symbol}_${side}` };
	if (side === "buy") {
		const spentQuote = fill.notional;
		const feeAmt = spentQuote.mul(fee);
		return {
			symbol,
			side,
			qtyBase: fill.qty,
			vwap: fill.vwap,
			fee: feeAmt,
			quoteDelta: spentQuote.add(feeAmt).neg(),
			baseDelta: fill.qty
		};
	}
	const proceeds = applyFeeOut(fill.notional, fee);
	const feeAmt = fill.notional.mul(fee);
	return {
		symbol,
		side,
		qtyBase: fill.qty,
		vwap: fill.vwap,
		fee: feeAmt,
		quoteDelta: proceeds,
		baseDelta: fill.qty.neg()
	};
}
/**
* Path USDT → BTC → ETH → USDT
* 1. buy BTC/USDT  2. buy ETH/BTC (spend BTC)  3. sell ETH/USDT
*/
function triangleUsdtBtcEthUsdt(books, startUsdt, fee, cFixed, minNetProfit, minNetRoi) {
	const reasons = [];
	const path = "USDT→BTC→ETH→USDT";
	const askBtc = books.btcUsdt.asks[0]?.price;
	if (!askBtc || !askBtc.gt(0)) return emptyTriangle(path, startUsdt, ["missing_btc_usdt_ask"], cFixed);
	const btcQty = startUsdt.div(askBtc);
	const leg1 = tradePair(books.btcUsdt, "buy", btcQty, fee, "BTC/USDT");
	if ("error" in leg1) return emptyTriangle(path, startUsdt, [leg1.error], cFixed);
	const spent1 = leg1.quoteDelta.abs();
	const btcGot = applyFeeOnBuyBase(leg1.qtyBase, fee);
	const askEthBtc = books.ethBtc.asks[0]?.price;
	if (!askEthBtc || !askEthBtc.gt(0)) return emptyTriangle(path, startUsdt, ["missing_eth_btc_ask"], cFixed);
	const ethQty = btcGot.div(askEthBtc);
	const leg2 = tradePair(books.ethBtc, "buy", ethQty, fee, "ETH/BTC");
	if ("error" in leg2) return emptyTriangle(path, startUsdt, [leg2.error], cFixed);
	const ethGot = applyFeeOnBuyBase(leg2.qtyBase, fee);
	const leg3 = tradePair(books.ethUsdt, "sell", ethGot, fee, "ETH/USDT");
	if ("error" in leg3) return emptyTriangle(path, startUsdt, [leg3.error], cFixed);
	const finalQuote = leg3.quoteDelta;
	return finalizeTriangle(path, startUsdt, finalQuote, [
		leg1,
		leg2,
		leg3
	], cFixed, minNetProfit, minNetRoi, reasons, spent1);
}
/**
* Path USDT → ETH → BTC → USDT
* 1. buy ETH/USDT  2. sell ETH/BTC  3. sell BTC/USDT
*/
function triangleUsdtEthBtcUsdt(books, startUsdt, fee, cFixed, minNetProfit, minNetRoi) {
	const reasons = [];
	const path = "USDT→ETH→BTC→USDT";
	const askEth = books.ethUsdt.asks[0]?.price;
	if (!askEth || !askEth.gt(0)) return emptyTriangle(path, startUsdt, ["missing_eth_usdt_ask"], cFixed);
	const ethQty = startUsdt.div(askEth);
	const leg1 = tradePair(books.ethUsdt, "buy", ethQty, fee, "ETH/USDT");
	if ("error" in leg1) return emptyTriangle(path, startUsdt, [leg1.error], cFixed);
	const ethGot = applyFeeOnBuyBase(leg1.qtyBase, fee);
	const leg2 = tradePair(books.ethBtc, "sell", ethGot, fee, "ETH/BTC");
	if ("error" in leg2) return emptyTriangle(path, startUsdt, [leg2.error], cFixed);
	const btcGot = applyFeeOut(leg2.qtyBase.mul(leg2.vwap), fee);
	const leg3 = tradePair(books.btcUsdt, "sell", btcGot, fee, "BTC/USDT");
	if ("error" in leg3) return emptyTriangle(path, startUsdt, [leg3.error], cFixed);
	return finalizeTriangle(path, startUsdt, leg3.quoteDelta, [
		leg1,
		leg2,
		leg3
	], cFixed, minNetProfit, minNetRoi, reasons, startUsdt);
}
function applyFeeOnBuyBase(base, fee) {
	return base.mul(d("1").sub(fee));
}
function emptyTriangle(path, start, reasons, cFixed) {
	return {
		path,
		startQuote: start,
		finalQuote: ZERO,
		netProfit: start.neg().sub(cFixed),
		netRoi: d("-1"),
		legs: [],
		reasons,
		tradable: false
	};
}
function finalizeTriangle(path, start, finalQuote, legs, cFixed, minNetProfit, minNetRoi, extra, _spent) {
	const reasons = [...extra];
	const netProfit = finalQuote.sub(start).sub(cFixed);
	const netRoi = start.gt(0) ? netProfit.div(start) : ZERO;
	if (netProfit.lt(minNetProfit)) reasons.push("net_profit_below_threshold");
	if (netRoi.lt(minNetRoi)) reasons.push("net_roi_below_threshold");
	if (legs.length !== 3) reasons.push("incomplete_legs");
	return {
		path,
		startQuote: start,
		finalQuote,
		netProfit,
		netRoi,
		legs,
		reasons,
		tradable: reasons.length === 0
	};
}
function compareCexDex(opts) {
	const dexPx = opts.dexAmountIn.gt(0) ? opts.dexAmountOut.div(opts.dexAmountIn) : ZERO;
	return {
		discrepancyBps: opts.cexExecutableBuy.gt(0) && dexPx.gt(0) ? dexPx.sub(opts.cexExecutableBuy).abs().div(opts.cexExecutableBuy).mul(d("10000")) : ZERO,
		estimatedNet: opts.dexAmountOut.sub(opts.dexAmountIn.mul(opts.cexExecutableBuy)).sub(opts.gasQuote).sub(opts.buffer),
		monitoringOnly: true
	};
}
function evaluateSpread(opts) {
	const symbol = opts.buy.symbol;
	const fBuy = d(opts.buy.venue === "bybit" ? opts.cfg.takerFeeBybit : opts.cfg.takerFeeBinance);
	const fSell = d(opts.sell.venue === "bybit" ? opts.cfg.takerFeeBybit : opts.cfg.takerFeeBinance);
	const qty = opts.forceQty ? d(opts.forceQty) : sizeSpreadQty({
		want: d(opts.wantQty ?? "0.01"),
		buyBook: opts.buy,
		sellBook: opts.sell,
		maxOrderNotional: d(opts.cfg.maxOrderNotional),
		maxSlippageBps: d(opts.cfg.maxSlippageBps),
		minQty: d("0.00001"),
		step: d("0.00001")
	});
	const stale = Math.max(opts.nowMs - opts.buy.tsMs, opts.nowMs - opts.sell.tsMs) > opts.cfg.maxStaleMs;
	const result = inventorySpread({
		buyBook: opts.buy,
		sellBook: opts.sell,
		qty: qty.gt(0) ? qty : d("0.001"),
		fBuy,
		fSell,
		cFixed: d(opts.cfg.uncertaintyBufferUsdt),
		minNetProfit: d(opts.cfg.minNetProfitUsdt),
		minNetRoi: d(opts.cfg.minNetRoi),
		maxSlippageBps: d(opts.cfg.maxSlippageBps)
	});
	const reasons = [...result.reasons];
	if (stale) reasons.push("stale_data");
	if (qty.lte(0) && !opts.forceQty) reasons.push("qty_below_min_after_sizing");
	const tradable = result.tradable && !stale && (qty.gt(0) || Boolean(opts.forceQty));
	return {
		id: `spread-${opts.buy.venue}-${opts.sell.venue}-${symbol}-${opts.nowMs}`,
		strategyId: "spread",
		status: tradable ? "accepted" : "rejected",
		symbol,
		expectedProfit: result.netProfit,
		expectedRoi: result.netRoi,
		confidence: tradable ? "medium" : "low",
		reasons,
		buyVenue: result.buyVenue,
		sellVenue: result.sellVenue,
		qty: result.qty,
		dataTsMs: Math.min(opts.buy.tsMs, opts.sell.tsMs),
		mode: "paper",
		details: {
			pBuy: moneyStr(result.pBuy, 8),
			pSell: moneyStr(result.pSell, 8),
			grossCost: moneyStr(result.grossCost, 8),
			buyFee: moneyStr(result.buyFee, 8),
			sellFee: moneyStr(result.sellFee, 8),
			cFixed: moneyStr(result.cFixed, 8),
			buySlippageBps: moneyStr(result.buySlippageBps, 4),
			sellSlippageBps: moneyStr(result.sellSlippageBps, 4),
			explanation: tradable ? `Inventory spread ${opts.buy.venue} buy / ${opts.sell.venue} sell after fees and buffer.` : `Rejected: ${reasons.join(", ")}`
		}
	};
}
function toSignal(r, nowMs, dataTs) {
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
			explanation: r.tradable ? `Three-leg loop ${r.path} clears fees and buffer.` : `Rejected: ${r.reasons.join(", ") || "unprofitable after fees"}`
		}
	};
}
function evaluateTriangles(books, cfg, nowMs) {
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
function evaluateDexMonitor(opts) {
	const fill = estimateFill(opts.cexBook, "buy", d(opts.qty));
	const cmp = compareCexDex({
		cexExecutableBuy: fill.vwap,
		dexAmountIn: opts.dex.amountIn,
		dexAmountOut: opts.dex.amountOut,
		gasQuote: opts.dex.gasQuote ?? d("0"),
		buffer: d(opts.buffer)
	});
	return {
		id: `dexmon-${opts.nowMs}`,
		strategyId: "dex_monitor",
		status: "rejected",
		symbol: `${opts.cexBook.symbol} vs ${opts.dex.chain}`,
		expectedProfit: cmp.estimatedNet,
		expectedRoi: d("0"),
		confidence: "low",
		reasons: ["monitoring_only", "dex_execution_disabled"],
		dataTsMs: Math.min(opts.cexBook.tsMs, opts.dex.tsMs),
		mode: "paper",
		details: {
			cexVwap: moneyStr(fill.vwap, 8),
			dexOut: moneyStr(opts.dex.amountOut, 8),
			dexIn: moneyStr(opts.dex.amountIn, 8),
			impactBps: moneyStr(opts.dex.priceImpactBps, 4),
			gasQuote: opts.dex.gasQuote ? moneyStr(opts.dex.gasQuote, 8) : "",
			route: opts.dex.route,
			discrepancyBps: moneyStr(cmp.discrepancyBps, 4),
			chain: opts.dex.chain,
			tokenIn: opts.dex.tokenIn,
			tokenOut: opts.dex.tokenOut,
			quoteTs: String(opts.dex.tsMs),
			label: "MONITORING ONLY — not executable",
			explanation: "CEX executable buy vs DEX estimated output. Research only. No swap, no approval, no wallet."
		}
	};
}
/** Research-only fixture. Never executable. */
var FixtureDexProvider = class {
	id = "fixture-dex";
	async quote(req) {
		const amtIn = d(req.amountIn);
		const out = amtIn.mul(d("0.9992"));
		return {
			provider: this.id,
			chain: req.chain,
			tokenIn: req.tokenIn,
			tokenOut: req.tokenOut,
			amountIn: amtIn,
			amountOut: out,
			priceImpactBps: d("8"),
			gasEstimate: "180000",
			gasQuote: d("2.40"),
			route: "fixture:uniswapv3-usdc-weth-0.05%",
			tsMs: Date.now(),
			executable: false
		};
	}
};
function book(venue, symbol, bids, asks, tsMs) {
	return {
		venue,
		symbol,
		tsMs,
		source: "fixture",
		bids: bids.map(([p, q]) => ({
			price: d(p),
			qty: d(q)
		})),
		asks: asks.map(([p, q]) => ({
			price: d(p),
			qty: d(q)
		}))
	};
}
/** Six canonical research cases used by the demo suite. */
function buildFixturePacks(nowMs = 17e11) {
	const fresh = nowMs - 200;
	const stale = nowMs - 3e4;
	return [
		{
			id: "fee_negative",
			title: "Looks profitable on mid, negative after fees",
			explanation: "Binance ask 100.00, Bybit bid 100.12 — a 12 bp raw spread. Two 10 bp taker fees plus the buffer consume the edge.",
			nowMs,
			buy: book("binance", "BTC/USDT", [["99.90", "2"]], [["100.00", "2"]], fresh),
			sell: book("bybit", "BTC/USDT", [["100.12", "2"]], [["100.20", "2"]], fresh)
		},
		{
			id: "valid_paper",
			title: "Valid inventory spread after fees",
			explanation: "Buy 50000 ask on Binance, sell 51200 bid on Bybit. After 10 bp each side and $0.50 buffer the net is still positive.",
			nowMs,
			buy: book("binance", "BTC/USDT", [["49900", "1"]], [["50000", "0.5"], ["50010", "1"]], fresh),
			sell: book("bybit", "BTC/USDT", [["51200", "0.5"], ["51100", "1"]], [["51300", "1"]], fresh)
		},
		{
			id: "insufficient_depth",
			title: "Insufficient depth",
			explanation: "Top of book looks wide but size is 0.0001 BTC — cannot fill the proposed quantity.",
			nowMs,
			buy: book("binance", "ETH/USDT", [["3000", "10"]], [["3001", "0.0001"]], fresh),
			sell: book("bybit", "ETH/USDT", [["3100", "0.0001"]], [["3110", "10"]], fresh)
		},
		{
			id: "stale",
			title: "Stale book rejection",
			explanation: "Books are 30 seconds old. Executable signals require age ≤ 5s.",
			nowMs,
			buy: book("binance", "SOL/USDT", [["140", "50"]], [["141", "50"]], stale),
			sell: book("bybit", "SOL/USDT", [["150", "50"]], [["151", "50"]], stale)
		},
		{
			id: "risk_limit",
			title: "Risk-limit rejection",
			explanation: "A 2 BTC clip at ~50k notional exceeds max_order_notional (75 USDT default).",
			nowMs,
			buy: book("binance", "BTC/USDT", [["49900", "5"]], [["50000", "5"]], fresh),
			sell: book("bybit", "BTC/USDT", [["52000", "5"]], [["52100", "5"]], fresh)
		},
		{
			id: "triangle_fee_negative",
			title: "Triangle dies after three-leg fees",
			explanation: "Cross rates look closed-to-arb on mids, but three 10 bp taker fees plus the buffer make the loop negative.",
			nowMs,
			books: {
				btcUsdt: book("binance", "BTC/USDT", [["50000", "5"]], [["50000", "5"]], fresh),
				ethUsdt: book("binance", "ETH/USDT", [["4000", "20"]], [["4000", "20"]], fresh),
				ethBtc: book("binance", "ETH/BTC", [["0.08", "20"]], [["0.08", "20"]], fresh)
			}
		}
	];
}
function evaluateLiveGate(cfg, snap) {
	const checks = {
		"1_app_mode_live": cfg.appMode === "live",
		"2_live_trading_enabled": cfg.liveTradingEnabled,
		"3_strategy_live_enabled": snap.strategyLiveEnabled,
		"4_exchange_trading_enabled": snap.exchangeTradingEnabled,
		"5_api_key_configured": snap.apiKeyConfigured,
		"6_no_withdrawal_permission": !snap.withdrawalPermission,
		"7_max_order_notional_set": (() => {
			try {
				return d(cfg.maxOrderNotional).gt(0);
			} catch {
				return false;
			}
		})(),
		"8_max_daily_loss_set": (() => {
			try {
				return d(cfg.maxDailyLossAbs).gt(0);
			} catch {
				return false;
			}
		})(),
		"9_risk_engine_healthy": snap.riskEngineHealthy && !snap.killSwitch,
		"10_market_data_fresh": snap.dataAgeMs <= cfg.maxStaleMs,
		"11_clock_sync": snap.clockDriftMs <= cfg.maxClockDriftMs,
		"12_confirmation_phrase": cfg.liveConfirmationPhrase === LIVE_PHRASE,
		"13_kill_switch_off": !snap.killSwitch
	};
	const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
	return {
		pass: failed.length === 0,
		failed,
		checks
	};
}
function reviewSignal(signal, cfg, snap) {
	const reasons = [];
	if (snap.killSwitch) reasons.push("kill_switch");
	if (snap.strategyPaused) reasons.push("strategy_paused");
	if (snap.nowMs < snap.cooldownUntilMs) reasons.push("cooldown");
	if (snap.consecutiveErrors >= cfg.maxConsecutiveErrors) reasons.push("consecutive_errors");
	if (snap.dataAgeMs > cfg.maxStaleMs) reasons.push("stale_data");
	if (!snap.feesConfigured) reasons.push("fees_unavailable");
	if (!snap.marketTrading) reasons.push("market_halted");
	if (snap.openOrders >= cfg.maxOpenOrders) reasons.push("max_open_orders");
	if (snap.openPositions >= cfg.maxConcurrentPositions) reasons.push("max_positions");
	try {
		const daily = d(snap.dailyRealizedPnl);
		const equity = d(snap.equity);
		const peak = d(snap.peakEquity);
		if (daily.lt(d(cfg.maxDailyLossAbs).neg())) reasons.push("max_daily_loss_abs");
		if (equity.gt(0) && daily.div(equity).mul(d("100")).lte(d(cfg.maxDailyLossPct).neg())) reasons.push("max_daily_loss_pct");
		if (peak.gt(0)) {
			if (peak.sub(equity).div(peak).mul(d("100")).gte(d(cfg.maxDrawdownPct))) reasons.push("max_drawdown");
		}
		if (signal.expectedProfit.gt(0)) {
			if ((signal.qty ? signal.qty : d("0")).gt(0) && signal.details.grossCost) {
				if (d(signal.details.grossCost).gt(d(cfg.maxOrderNotional))) reasons.push("max_order_notional");
			}
		}
	} catch {
		reasons.push("invalid_risk_math");
	}
	if (signal.mode === "live") {
		const gate = evaluateLiveGate(cfg, snap);
		if (!gate.pass) reasons.push("live_gate:" + gate.failed.join(","));
	}
	if (signal.status === "rejected") reasons.push("signal_rejected");
	return {
		allow: reasons.length === 0,
		reasons
	};
}
function shouldAutoKill(cfg, snap) {
	if (snap.consecutiveErrors >= cfg.maxConsecutiveErrors) return true;
	try {
		if (d(snap.dailyRealizedPnl).lt(d(cfg.maxDailyLossAbs).neg())) return true;
		const equity = d(snap.equity);
		const peak = d(snap.peakEquity);
		if (peak.gt(0) && peak.sub(equity).div(peak).mul(d("100")).gte(d(cfg.maxDrawdownPct))) return true;
	} catch {
		return true;
	}
	return false;
}
/**
* Live broker is a fail-closed placeholder. It never sends HTTP unless the
* gate passes — and even then MVP still refuses unless an explicit
* experimental flag is set (always false in this build).
*/
function attemptLiveOrder(cfg, snap, _intent) {
	const gate = evaluateLiveGate(cfg, snap);
	if (!gate.pass) return {
		blocked: true,
		failed: gate.failed,
		message: "Live order blocked by safety gate: " + gate.failed.join(", ")
	};
	return {
		blocked: true,
		failed: ["mvp_live_execution_not_armed"],
		message: "Live gate passed but MVP live execution is not armed. Paper-only delivery. No HTTP order was sent."
	};
}
function splitSymbol(symbol) {
	const [base, quote] = symbol.split("/");
	return {
		base,
		quote
	};
}
function getBal(state, venue, asset) {
	let b = state.balances.find((x) => x.venue === venue && x.asset === asset);
	if (!b) {
		b = {
			venue,
			asset,
			free: ZERO,
			locked: ZERO
		};
		state.balances.push(b);
	}
	return b;
}
function seedPaperInventory() {
	const venues = ["binance", "bybit"];
	const out = [];
	for (const v of venues) out.push({
		venue: v,
		asset: "USDT",
		free: d("10000"),
		locked: ZERO
	}, {
		venue: v,
		asset: "BTC",
		free: d("0.15"),
		locked: ZERO
	}, {
		venue: v,
		asset: "ETH",
		free: d("2.0"),
		locked: ZERO
	}, {
		venue: v,
		asset: "SOL",
		free: d("20"),
		locked: ZERO
	});
	return out;
}
/**
* Deterministic paper matching against a provided book snapshot.
* Market orders walk the book. Limit orders fill only at or better than limit.
*/
function submitPaperOrder(state, intent, opts) {
	const id = `P-${opts.nowMs}-${intent.clientId}`;
	const { base, quote } = splitSymbol(intent.symbol);
	const order = {
		id,
		clientId: intent.clientId,
		venue: intent.venue,
		symbol: intent.symbol,
		side: intent.side,
		type: intent.type,
		qty: intent.qty,
		filledQty: ZERO,
		avgPrice: ZERO,
		status: "new",
		feePaid: ZERO,
		strategyId: intent.strategyId,
		signalId: intent.signalId,
		mode: "paper",
		fills: [],
		createdTsMs: opts.nowMs,
		updatedTsMs: opts.nowMs + state.latencyMs
	};
	if (!isPositive(intent.qty) || intent.qty.lt(opts.minQty)) {
		order.status = "rejected";
		order.rejectReason = "min_qty";
		state.orders.push(order);
		return order;
	}
	let workingQty = intent.qty;
	if (intent.type === "limit" && intent.limitPrice) {
		const top = intent.side === "buy" ? opts.book.asks[0]?.price : opts.book.bids[0]?.price;
		if (!top) {
			order.status = "rejected";
			order.rejectReason = "empty_book";
			state.orders.push(order);
			return order;
		}
		if (!(intent.side === "buy" ? intent.limitPrice.gte(top) : intent.limitPrice.lte(top))) {
			order.status = "accepted";
			order.rejectReason = "resting_unfilled";
			state.orders.push(order);
			return order;
		}
	}
	const fill = estimateFill(opts.book, intent.side, workingQty);
	if (!fill.sufficient && !opts.allowPartial) {
		order.status = "rejected";
		order.rejectReason = "insufficient_depth";
		state.orders.push(order);
		return order;
	}
	if (!fill.sufficient && fill.qty.lte(0)) {
		order.status = "rejected";
		order.rejectReason = "insufficient_depth";
		state.orders.push(order);
		return order;
	}
	const fillQty = fill.qty;
	const notional = fillQty.mul(fill.vwap);
	if (notional.lt(opts.minNotional)) {
		order.status = "rejected";
		order.rejectReason = "min_notional";
		state.orders.push(order);
		return order;
	}
	const fee = notional.mul(intent.feeRate);
	const quoteBal = getBal(state, intent.venue, quote);
	const baseBal = getBal(state, intent.venue, base);
	if (intent.side === "buy") {
		const need = notional.add(fee);
		if (quoteBal.free.lt(need)) {
			order.status = "rejected";
			order.rejectReason = "insufficient_balance_quote";
			state.orders.push(order);
			return order;
		}
		quoteBal.free = quoteBal.free.sub(need);
		baseBal.free = baseBal.free.add(fillQty);
	} else {
		if (baseBal.free.lt(fillQty)) {
			order.status = "rejected";
			order.rejectReason = "insufficient_balance_base";
			state.orders.push(order);
			return order;
		}
		baseBal.free = baseBal.free.sub(fillQty);
		quoteBal.free = quoteBal.free.add(notional.sub(fee));
	}
	order.filledQty = fillQty;
	order.avgPrice = fill.vwap;
	order.feePaid = fee;
	order.fills.push({
		price: fill.vwap,
		qty: fillQty,
		fee,
		feeAsset: quote,
		tsMs: order.updatedTsMs
	});
	order.status = fill.unfilled.gt(0) ? "partially_filled" : "filled";
	state.orders.push(order);
	return order;
}
function markToMarket(balances, prices) {
	let eq = ZERO;
	for (const b of balances) {
		const amt = b.free.add(b.locked);
		if (b.asset === "USDT") {
			eq = eq.add(amt);
			continue;
		}
		const px = prices[`${b.asset}/USDT`];
		if (px) eq = eq.add(amt.mul(px));
	}
	return eq;
}
function baseSnap(cfg, nowMs, overrides = {}) {
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
		...overrides
	};
}
function paperFromSignal(state, signal, books, cfg, nowMs) {
	const out = [];
	if (!signal.buyVenue || !signal.sellVenue || !signal.qty || !books.buy || !books.sell) return out;
	const feeBuy = d(signal.buyVenue === "bybit" ? cfg.takerFeeBybit : cfg.takerFeeBinance);
	const feeSell = d(signal.sellVenue === "bybit" ? cfg.takerFeeBybit : cfg.takerFeeBinance);
	const buy = submitPaperOrder(state, {
		venue: signal.buyVenue,
		symbol: books.buy.symbol,
		side: "buy",
		type: "market",
		qty: signal.qty,
		feeRate: feeBuy,
		clientId: signal.id + "-b",
		strategyId: signal.strategyId,
		signalId: signal.id
	}, {
		book: books.buy,
		nowMs,
		minQty: d("0.00001"),
		minNotional: d("5"),
		allowPartial: false
	});
	out.push(buy);
	if (buy.status === "filled" || buy.status === "partially_filled") {
		const sell = submitPaperOrder(state, {
			venue: signal.sellVenue,
			symbol: books.sell.symbol,
			side: "sell",
			type: "market",
			qty: buy.filledQty,
			feeRate: feeSell,
			clientId: signal.id + "-s",
			strategyId: signal.strategyId,
			signalId: signal.id
		}, {
			book: books.sell,
			nowMs,
			minQty: d("0.00001"),
			minNotional: d("5"),
			allowPartial: false
		});
		out.push(sell);
	}
	return out;
}
function runFixtureSuite(cfg = DEFAULT_CONFIG, nowMs = Date.now(), state) {
	const paper = state ?? {
		balances: seedPaperInventory(),
		orders: [],
		latencyMs: 50
	};
	const packs = buildFixturePacks(nowMs);
	const signals = [];
	const events = [];
	const liveBlocked = [];
	const snap0 = baseSnap(cfg, nowMs);
	for (const pack of packs) {
		if (pack.id === "triangle_fee_negative" && pack.books) {
			const tri = evaluateTriangles(pack.books, cfg, pack.nowMs);
			for (const s of tri) signals.push(s);
			continue;
		}
		if (!pack.buy || !pack.sell) continue;
		const forceQty = pack.id === "risk_limit" ? "2" : pack.id === "insufficient_depth" ? "1" : pack.id === "valid_paper" ? void 0 : "0.05";
		const signal = evaluateSpread({
			buy: pack.buy,
			sell: pack.sell,
			cfg,
			nowMs: pack.nowMs,
			forceQty
		});
		signal.details.fixture = pack.id;
		signal.details.fixtureTitle = pack.title;
		signal.details.fixtureNote = pack.explanation;
		const age = Math.max(pack.nowMs - pack.buy.tsMs, pack.nowMs - pack.sell.tsMs);
		const snap = baseSnap(cfg, pack.nowMs, { dataAgeMs: age });
		if (pack.id === "risk_limit") signal.details.grossCost = moneyStr(d("2").mul(d("50000")), 2);
		const decision = reviewSignal(signal, cfg, snap);
		if (!decision.allow) {
			signal.status = "blocked";
			signal.reasons = [...signal.reasons, ...decision.reasons];
		}
		signals.push(signal);
		if (signal.status === "accepted" && decision.allow) {
			const orders = paperFromSignal(paper, signal, {
				buy: pack.buy,
				sell: pack.sell
			}, cfg, pack.nowMs);
			events.push({
				level: "info",
				type: "paper_fill",
				message: `Paper legs for ${pack.id}: ${orders.map((o) => o.status).join(",")}`,
				tsMs: pack.nowMs
			});
		} else events.push({
			level: "info",
			type: "signal_rejected",
			message: `${pack.id}: ${signal.reasons.join(", ")}`,
			tsMs: pack.nowMs
		});
		const live = attemptLiveOrder(cfg, baseSnap(cfg, pack.nowMs, { dataAgeMs: age }), {
			venue: "binance",
			symbol: pack.buy.symbol,
			side: "buy",
			type: "market",
			qty: d("0.001"),
			feeRate: d(cfg.takerFeeBinance),
			clientId: "live-demo",
			strategyId: "spread",
			signalId: signal.id
		});
		liveBlocked.push({
			message: live.message,
			failed: live.failed
		});
	}
	if (packs.find((p) => p.id === "valid_paper")?.buy) new FixtureDexProvider().quote({
		chain: "ethereum",
		tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
		tokenOut: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
		amountIn: "1000000000000000000"
	}).then(() => void 0);
	const gate = evaluateLiveGate(cfg, snap0);
	const autoKill = shouldAutoKill(cfg, snap0);
	return {
		signals,
		orders: paper.orders,
		balances: paper.balances,
		events,
		liveBlocked,
		autoKill,
		liveGate: gate
	};
}
async function dexMonitorSignal(cexBook, cfg, nowMs) {
	return evaluateDexMonitor({
		cexBook,
		dex: await new FixtureDexProvider().quote({
			chain: "ethereum",
			tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
			tokenOut: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
			amountIn: "1000000000000000000"
		}),
		qty: "0.01",
		nowMs,
		buffer: cfg.uncertaintyBufferUsdt
	});
}
var VENUE_SYMBOL = {
	binance: {
		"BTC/USDT": "BTCUSDT",
		"ETH/USDT": "ETHUSDT",
		"SOL/USDT": "SOLUSDT",
		"ETH/BTC": "ETHBTC"
	},
	bybit: {
		"BTC/USDT": "BTCUSDT",
		"ETH/USDT": "ETHUSDT",
		"SOL/USDT": "SOLUSDT",
		"ETH/BTC": "ETHBTC"
	},
	dex: {}
};
function fromBinanceDepth(symbol, json, tsMs) {
	return {
		venue: "binance",
		symbol,
		tsMs,
		source: "rest",
		bids: (json.bids ?? []).slice(0, 20).map(([p, q]) => ({
			price: d(p),
			qty: d(q)
		})),
		asks: (json.asks ?? []).slice(0, 20).map(([p, q]) => ({
			price: d(p),
			qty: d(q)
		}))
	};
}
function fromBybitDepth(symbol, json, fallbackTs) {
	return {
		venue: "bybit",
		symbol,
		tsMs: json.ts ?? fallbackTs,
		source: "rest",
		bids: (json.b ?? []).slice(0, 20).map(([p, q]) => ({
			price: d(p),
			qty: d(q)
		})),
		asks: (json.a ?? []).slice(0, 20).map(([p, q]) => ({
			price: d(p),
			qty: d(q)
		}))
	};
}
var TIMEOUT_MS = 4e3;
async function getJson(url) {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(url, {
			signal: ctrl.signal,
			headers: { accept: "application/json" }
		});
		if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
		return await res.json();
	} finally {
		clearTimeout(t);
	}
}
async function fetchBinanceBook(symbol) {
	const s = VENUE_SYMBOL.binance[symbol];
	if (!s) throw new Error(`unsupported ${symbol}`);
	return fromBinanceDepth(symbol, await getJson(`https://api.binance.com/api/v3/depth?symbol=${s}&limit=20`), Date.now());
}
async function fetchBybitBook(symbol) {
	const s = VENUE_SYMBOL.bybit[symbol];
	if (!s) throw new Error(`unsupported ${symbol}`);
	const json = await getJson(`https://api.bybit.com/v5/market/orderbook?category=spot&symbol=${s}&limit=20`);
	if (!json.result) throw new Error("bybit empty");
	return fromBybitDepth(symbol, json.result, json.time ?? Date.now());
}
async function fetchVenueBook(venue, symbol) {
	if (venue === "binance") return fetchBinanceBook(symbol);
	if (venue === "bybit") return fetchBybitBook(symbol);
	throw new Error(`no cex adapter for ${venue}`);
}
async function fetchBinanceServerTime() {
	return (await getJson("https://api.binance.com/api/v3/time")).serverTime;
}
var STRATEGIES = [
	{
		id: "spread",
		name: "Multi-CEX inventory spread",
		kind: "spread",
		notes: "Paper trader. Pre-funded inventory on Binance and Bybit. No transfers."
	},
	{
		id: "triangle",
		name: "Binance triangular scanner",
		kind: "triangle",
		notes: "USDT triangles on Binance spot. Paper only by default."
	},
	{
		id: "dex_monitor",
		name: "CEX/DEX discrepancy monitor",
		kind: "dex_monitor",
		notes: "MONITORING ONLY. Never executes swaps."
	}
];
async function ensureWorkspace(userId) {
	const sql = await getSql();
	if ((await sql`select user_id from system_state where user_id = ${userId}`).length) return;
	await sql.query(`insert into system_state (user_id, config_json, app_mode) values ($1, $2::jsonb, 'paper')`, [userId, JSON.stringify(DEFAULT_CONFIG)]);
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
	for (const ex of [["binance", "Binance Spot"], ["bybit", "Bybit Spot"]]) {
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
	for (const b of bals) await sql`
      insert into balances (user_id, mode, venue, asset, free, locked)
      values (${userId}, 'paper', ${b.venue}, ${b.asset}, ${moneyStr(b.free, 12)}::numeric, 0)
    `;
	await sql`
    insert into system_events (user_id, kind, message)
    values (${userId}, 'startup', 'Workspace initialized. Default mode PAPER. Live trading disabled.')
  `;
}
async function loadConfig(userId) {
	const rows = await (await getSql())`
    select config_json, kill_switch from system_state where user_id = ${userId}
  `;
	const cfg = {
		...DEFAULT_CONFIG,
		...rows[0]?.config_json ?? {}
	};
	cfg.killSwitch = Boolean(rows[0]?.kill_switch);
	return cfg;
}
function signalRow(userId, s) {
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
		dataTs: new Date(s.dataTsMs).toISOString()
	};
}
async function persistEngine(userId, result, source) {
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
		for (const f of o.fills) await sql`
        insert into fills (user_id, order_id, price, qty, fee, fee_asset, mode)
        values (${userId}, ${o.id}, ${moneyStr(f.price, 12)}::numeric, ${moneyStr(f.qty, 12)}::numeric, ${moneyStr(f.fee, 12)}::numeric, ${f.feeAsset}, 'paper')
      `;
	}
	for (const b of result.balances) await sql`
      insert into balances (user_id, mode, venue, asset, free, locked, updated_at)
      values (${userId}, 'paper', ${b.venue}, ${b.asset}, ${moneyStr(b.free, 12)}::numeric, ${moneyStr(b.locked, 12)}::numeric, now())
      on conflict (user_id, mode, venue, asset)
      do update set free = excluded.free, locked = excluded.locked, updated_at = now()
    `;
	for (const e of result.events) await sql`
      insert into system_events (user_id, kind, message)
      values (${userId}, ${e.type}, ${e.message})
    `;
	for (const b of result.liveBlocked.slice(0, 3)) await sql`
      insert into risk_events (user_id, severity, kind, message, details_json)
      values (${userId}, 'info', 'live_blocked', ${b.message}, ${JSON.stringify({ failed: b.failed })}::jsonb)
    `;
	await sql`
    insert into alert_logs (user_id, kind, message, dedup_key)
    values (${userId}, 'scan', ${"Scan complete (" + source + ")"}, ${"scan-" + source + "-" + Date.now()})
  `;
	await sql`update system_state set last_scan_at = now() where user_id = ${userId}`;
}
async function runAndPersistFixtures(userId) {
	await ensureWorkspace(userId);
	const cfg = await loadConfig(userId);
	const sql = await getSql();
	const paperBals = (await sql`
    select venue, asset, free, locked from balances where user_id = ${userId} and mode = 'paper'
  `).map((b) => ({
		venue: b.venue,
		asset: b.asset,
		free: d(b.free),
		locked: d(b.locked)
	}));
	const result = runFixtureSuite(cfg, Date.now(), {
		balances: paperBals.length ? paperBals : seedPaperInventory(),
		orders: [],
		latencyMs: 40
	});
	await persistEngine(userId, result, "fixtures");
	const eq = markToMarket(result.balances, {
		"BTC/USDT": d("50000"),
		"ETH/USDT": d("4000"),
		"SOL/USDT": d("140")
	});
	await sql`
    insert into portfolio_snapshots (user_id, mode, equity)
    values (${userId}, 'paper', ${moneyStr(eq, 8)}::numeric)
  `;
	return {
		signals: result.signals.length,
		orders: result.orders.length
	};
}
async function runLiveMarketScan(userId) {
	await ensureWorkspace(userId);
	const cfg = await loadConfig(userId);
	const sql = await getSql();
	const pairs = [
		"BTC/USDT",
		"ETH/USDT",
		"SOL/USDT"
	];
	const books = [];
	const errors = [];
	let drift = 0;
	try {
		const server = await fetchBinanceServerTime();
		drift = Math.abs(Date.now() - server);
	} catch (e) {
		errors.push("clock: " + (e instanceof Error ? e.message : "fail"));
		drift = 99999;
	}
	for (const symbol of pairs) for (const venue of ["binance", "bybit"]) try {
		const book = await fetchVenueBook(venue, symbol);
		books.push({
			venue,
			symbol,
			book
		});
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
	const signals = [];
	const nowMs = Date.now();
	for (const symbol of pairs) {
		const bn = books.find((b) => b.venue === "binance" && b.symbol === symbol)?.book;
		const by = books.find((b) => b.venue === "bybit" && b.symbol === symbol)?.book;
		if (bn && by) {
			signals.push(evaluateSpread({
				buy: bn,
				sell: by,
				cfg,
				nowMs
			}));
			signals.push(evaluateSpread({
				buy: by,
				sell: bn,
				cfg,
				nowMs
			}));
		}
	}
	try {
		const btc = await fetchVenueBook("binance", "BTC/USDT");
		const eth = await fetchVenueBook("binance", "ETH/USDT");
		const ethbtc = await fetchVenueBook("binance", "ETH/BTC");
		signals.push(...evaluateTriangles({
			btcUsdt: btc,
			ethUsdt: eth,
			ethBtc: ethbtc
		}, cfg, nowMs));
		const dex = await dexMonitorSignal(eth, cfg, nowMs);
		signals.push(dex);
	} catch (e) {
		errors.push("triangle/dex: " + (e instanceof Error ? e.message : "fail"));
	}
	await persistEngine(userId, {
		signals,
		orders: [],
		balances: [],
		events: errors.map((message) => ({
			level: "warn",
			type: "feed_error",
			message,
			tsMs: nowMs
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
			riskEngineHealthy: true
		})
	}, "live-scan");
	if (drift > cfg.maxClockDriftMs) await sql`
      insert into risk_events (user_id, severity, kind, message, details_json)
      values (${userId}, 'warn', 'clock_drift', ${"Clock drift " + drift + "ms"}, '{}'::jsonb)
    `;
	return {
		ok: errors.length === 0,
		error: errors[0],
		signals: signals.length
	};
}
async function setKillSwitch(userId, on) {
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
async function patchConfig(userId, patch) {
	const cfg = await loadConfig(userId);
	const next = {
		...cfg,
		...patch
	};
	const { validateConfig } = await import("./config-CVMdV5TK.mjs").then((n) => n.a).then((n) => n.n);
	const errors = validateConfig(next);
	if (next.appMode === "live" && next.liveTradingEnabled && errors.length) return {
		ok: false,
		errors
	};
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
	for (const [k, v] of Object.entries(patch)) await sql`
      insert into config_audit_logs (user_id, field, old_value, new_value)
      values (${userId}, ${k}, ${String(cfg[k] ?? "")}, ${k.toLowerCase().includes("phrase") || k.toLowerCase().includes("token") ? "[REDACTED]" : String(v)})
    `;
	return {
		ok: true,
		errors: []
	};
}
async function setStrategyFlags(userId, id, flags) {
	const sql = await getSql();
	if (flags.paused !== void 0) await sql`update strategies set paused = ${flags.paused} where user_id = ${userId} and id = ${id}`;
	if (flags.enabled !== void 0) await sql`update strategies set enabled = ${flags.enabled} where user_id = ${userId} and id = ${id}`;
	if (flags.liveEnabled !== void 0) {
		await sql`update strategies set live_enabled = ${false} where user_id = ${userId} and id = ${id}`;
		await sql`
      insert into config_audit_logs (user_id, field, old_value, new_value)
      values (${userId}, ${"strategy." + id + ".live_enabled"}, 'false', 'false (MVP forces paper)')
    `;
	}
}
async function loadDashboard(userId) {
	await ensureWorkspace(userId);
	const sql = await getSql();
	const state = await sql`select kill_switch, last_scan_at, consecutive_errors, config_json from system_state where user_id = ${userId}`;
	const cfg = {
		...DEFAULT_CONFIG,
		...state[0]?.config_json ?? {}
	};
	cfg.killSwitch = Boolean(state[0]?.kill_switch);
	const mode = displayMode(cfg, cfg.killSwitch);
	const strategies = await sql`select id, name, kind, enabled, paused, live_enabled, notes from strategies where user_id = ${userId}`;
	const exchanges = await sql`select id, name, status, last_error, last_ok_at, trading_enabled, key_configured from exchanges where user_id = ${userId}`;
	const signals = await sql`
    select id, strategy_id, status, symbol, expected_profit::text, expected_roi::text, reasons, mode, created_at::text, details_json
    from signals where user_id = ${userId} order by created_at desc limit 80
  `;
	const opportunities = await sql`
    select id, strategy_id, symbol, expected_profit::text, expected_roi::text, status, explanation, created_at::text
    from opportunities where user_id = ${userId} order by created_at desc limit 80
  `;
	const orders = await sql`
    select id, venue, market, side, order_type, qty::text, filled_qty::text, avg_price::text, status, reject_reason, mode, created_at::text, strategy_id
    from orders where user_id = ${userId} order by created_at desc limit 80
  `;
	const fills = await sql`
    select id::text, order_id, price::text, qty::text, fee::text, fee_asset, mode, ts::text
    from fills where user_id = ${userId} order by ts desc limit 80
  `;
	const paperBalances = await sql`
    select venue, asset, free::text, locked::text from balances where user_id = ${userId} and mode = 'paper' order by venue, asset
  `;
	const liveBalances = await sql`
    select venue, asset, free::text, locked::text from balances where user_id = ${userId} and mode = 'live' order by venue, asset
  `;
	const pnl = await sql`
    select id::text, mode, kind, amount::text, note, ts::text from pnl_records where user_id = ${userId} order by ts desc limit 40
  `;
	const riskEvents = await sql`
    select id::text, severity, kind, message, ts::text from risk_events where user_id = ${userId} order by ts desc limit 40
  `;
	const systemEvents = await sql`
    select id::text, kind, message, ts::text from system_events where user_id = ${userId} order by ts desc limit 40
  `;
	const alerts = await sql`
    select id::text, kind, message, ts::text from alert_logs where user_id = ${userId} order by ts desc limit 40
  `;
	const audit = await sql`
    select id::text, field, old_value, new_value, ts::text from config_audit_logs where user_id = ${userId} order by ts desc limit 40
  `;
	const paperEqRows = await sql`
    select equity::text from portfolio_snapshots where user_id = ${userId} and mode = 'paper' order by ts desc limit 1
  `;
	const prices = {
		"BTC/USDT": d("50000"),
		"ETH/USDT": d("4000"),
		"SOL/USDT": d("140")
	};
	const pxRows = await sql`
    select distinct on (market) market, ask::text from price_snapshots
    where user_id = ${userId} order by market, ts desc
  `;
	for (const p of pxRows) try {
		prices[p.market] = d(p.ask);
	} catch {}
	const balsParsed = paperBalances.map((b) => ({
		venue: String(b.venue),
		asset: String(b.asset),
		free: d(String(b.free)),
		locked: d(String(b.locked ?? "0"))
	}));
	const paperEquity = balsParsed.length ? moneyStr(markToMarket(balsParsed, prices), 2) : paperEqRows[0]?.equity ?? "0.00";
	const counts = await sql`select count(*)::int as c from signals where user_id = ${userId}`;
	const acc = await sql`select count(*)::int as c from signals where user_id = ${userId} and status = 'accepted'`;
	const rej = await sql`select count(*)::int as c from signals where user_id = ${userId} and status in ('rejected','blocked')`;
	const openP = await sql`select count(*)::int as c from orders where user_id = ${userId} and mode = 'paper' and status in ('new','accepted','partially_filled')`;
	const risks = await sql`select count(*)::int as c from risk_events where user_id = ${userId}`;
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
		riskEngineHealthy: true
	});
	const stringify = (rows) => rows.map((r) => {
		const o = {};
		for (const [k, v] of Object.entries(r)) o[k] = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
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
			notes: s.notes
		})),
		exchanges: exchanges.map((e) => ({
			id: e.id,
			name: e.name,
			status: e.status,
			lastError: e.last_error,
			lastOk: e.last_ok_at,
			tradingEnabled: false,
			keyConfigured: e.key_configured
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
		config: {
			...cfg,
			liveConfirmationPhrase: cfg.liveConfirmationPhrase ? "[set]" : ""
		},
		disclaimer: "No strategy guarantees profit. Paper results are simulated. Live trading is disabled unless every safety gate passes. You can lose money."
	};
}
async function resetPaper(userId) {
	const sql = await getSql();
	await sql`delete from balances where user_id = ${userId} and mode = 'paper'`;
	for (const b of seedPaperInventory()) await sql`
      insert into balances (user_id, mode, venue, asset, free, locked)
      values (${userId}, 'paper', ${b.venue}, ${b.asset}, ${moneyStr(b.free, 12)}::numeric, 0)
    `;
	await sql`
    insert into system_events (user_id, kind, message)
    values (${userId}, 'reset', 'Paper inventory reset to defaults.')
  `;
}
//#endregion
export { ensureWorkspace, loadDashboard, patchConfig, resetPaper, runAndPersistFixtures, runLiveMarketScan, setKillSwitch, setStrategyFlags };
