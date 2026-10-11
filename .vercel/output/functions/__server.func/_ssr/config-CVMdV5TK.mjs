import { r as __exportAll } from "../_runtime.mjs";
import { t as __exportAll$1 } from "./rolldown-runtime-D7D4PA-g.mjs";
import { t as Decimal } from "../_libs/decimal.js.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/config-CVMdV5TK.js
var config_CVMdV5TK_exports = /* @__PURE__ */ __exportAll({
	a: () => ZERO,
	c: () => isPositive,
	d: () => LIVE_PHRASE,
	i: () => BPS,
	l: () => minD,
	n: () => config_exports,
	o: () => d,
	r: () => displayMode,
	s: () => floorToStep,
	t: () => DEFAULT_CONFIG,
	u: () => moneyStr
});
var LIVE_PHRASE = "I_UNDERSTAND_LIVE_TRADING_CAN_LOSE_MONEY";
/** Financial arithmetic. Never pass IEEE-754 numbers into money constructors. */
Decimal.set({
	precision: 40,
	rounding: Decimal.ROUND_HALF_EVEN
});
var MoneyError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "MoneyError";
	}
};
function d(value) {
	if (value instanceof Decimal) {
		if (!value.isFinite()) throw new MoneyError("non-finite Decimal");
		return value;
	}
	if (typeof value !== "string") throw new MoneyError("money values must be Decimal or decimal string");
	const trimmed = value.trim();
	if (!trimmed || /[eE]/.test(trimmed) === false && !/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
		if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) throw new MoneyError(`invalid decimal string: ${trimmed}`);
	}
	const n = new Decimal(trimmed);
	if (!n.isFinite()) throw new MoneyError("non-finite Decimal");
	return n;
}
var ZERO = d("0");
d("1");
var BPS = d("10000");
function isPositive(x) {
	return x.gt(0);
}
function minD(...xs) {
	return xs.reduce((a, b) => a.lt(b) ? a : b);
}
function moneyStr(x, dp = 8) {
	return x.toFixed(dp);
}
/** Floor to a positive step size (never overstate output). */
function floorToStep(qty, step) {
	if (!step.gt(0)) throw new MoneyError("step must be positive");
	if (qty.lte(0)) return ZERO;
	return qty.div(step).toDecimalPlaces(0, Decimal.ROUND_DOWN).mul(step);
}
var config_exports = /* @__PURE__ */ __exportAll$1({
	DEFAULT_CONFIG: () => DEFAULT_CONFIG,
	displayMode: () => displayMode,
	validateConfig: () => validateConfig
});
var DEFAULT_CONFIG = {
	appMode: "paper",
	liveTradingEnabled: false,
	liveConfirmationPhrase: "",
	killSwitch: false,
	flattenOnKill: false,
	quoteCcy: "USDT",
	maxGlobalLiveNotional: "250",
	maxStrategyNotional: "150",
	maxAssetExposure: "200",
	maxOrderNotional: "75",
	maxDailyLossAbs: "25",
	maxDailyLossPct: "2",
	maxDrawdownPct: "8",
	maxConsecutiveErrors: 5,
	maxStaleMs: 5e3,
	maxBookAgeMs: 5e3,
	maxClockDriftMs: 1e3,
	maxOpenOrders: 4,
	maxConcurrentPositions: 4,
	cooldownAfterBreachS: 900,
	takerFeeBinance: "0.001",
	takerFeeBybit: "0.001",
	uncertaintyBufferUsdt: "0.50",
	minNetProfitUsdt: "0.25",
	minNetRoi: "0.0005",
	maxSlippageBps: "15",
	pairs: [
		"BTC/USDT",
		"ETH/USDT",
		"SOL/USDT"
	],
	telegramEnabled: false
};
function validateConfig(cfg) {
	const errs = [];
	const pos = (name, v) => {
		try {
			if (!d(v).gt(0)) errs.push(`${name} must be > 0`);
		} catch {
			errs.push(`${name} is not a decimal`);
		}
	};
	pos("max_order_notional", cfg.maxOrderNotional);
	pos("max_daily_loss_abs", cfg.maxDailyLossAbs);
	pos("max_strategy_notional", cfg.maxStrategyNotional);
	if (cfg.appMode === "live" && cfg.liveTradingEnabled) {
		if (cfg.liveConfirmationPhrase !== "I_UNDERSTAND_LIVE_TRADING_CAN_LOSE_MONEY") errs.push("live confirmation phrase missing or incorrect");
	}
	if (cfg.appMode !== "paper" && cfg.appMode !== "live") errs.push("invalid app_mode");
	return errs;
}
function displayMode(cfg, kill) {
	if (cfg.appMode !== "live" || !cfg.liveTradingEnabled || kill) {
		if (cfg.appMode === "live" && cfg.liveTradingEnabled && kill) return "LIVE DISABLED";
		if (cfg.appMode === "live") return "LIVE DISABLED";
		return "PAPER";
	}
	if (cfg.liveConfirmationPhrase !== "I_UNDERSTAND_LIVE_TRADING_CAN_LOSE_MONEY") return "LIVE DISABLED";
	return "LIVE ENABLED";
}
//#endregion
export { config_CVMdV5TK_exports as a, floorToStep as c, moneyStr as d, ZERO as i, isPositive as l, DEFAULT_CONFIG as n, d as o, LIVE_PHRASE as r, displayMode as s, BPS as t, minD as u };
