import { LIVE_PHRASE } from "./types.ts";
import { d } from "./money.ts";

export interface EdgeConfig {
  appMode: "paper" | "live";
  liveTradingEnabled: boolean;
  liveConfirmationPhrase: string;
  killSwitch: boolean;
  flattenOnKill: boolean;
  quoteCcy: "USDT";
  maxGlobalLiveNotional: string;
  maxStrategyNotional: string;
  maxAssetExposure: string;
  maxOrderNotional: string;
  maxDailyLossAbs: string;
  maxDailyLossPct: string;
  maxDrawdownPct: string;
  maxConsecutiveErrors: number;
  maxStaleMs: number;
  maxBookAgeMs: number;
  maxClockDriftMs: number;
  maxOpenOrders: number;
  maxConcurrentPositions: number;
  cooldownAfterBreachS: number;
  takerFeeBinance: string;
  takerFeeBybit: string;
  uncertaintyBufferUsdt: string;
  minNetProfitUsdt: string;
  minNetRoi: string;
  maxSlippageBps: string;
  pairs: string[];
  telegramEnabled: boolean;
}

export const DEFAULT_CONFIG: EdgeConfig = {
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
  maxStaleMs: 5000,
  maxBookAgeMs: 5000,
  maxClockDriftMs: 1000,
  maxOpenOrders: 4,
  maxConcurrentPositions: 4,
  cooldownAfterBreachS: 900,
  takerFeeBinance: "0.001",
  takerFeeBybit: "0.001",
  uncertaintyBufferUsdt: "0.50",
  minNetProfitUsdt: "0.25",
  minNetRoi: "0.0005",
  maxSlippageBps: "15",
  pairs: ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
  telegramEnabled: false,
};

export function validateConfig(cfg: EdgeConfig): string[] {
  const errs: string[] = [];
  const pos = (name: string, v: string) => {
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
    if (cfg.liveConfirmationPhrase !== LIVE_PHRASE) {
      errs.push("live confirmation phrase missing or incorrect");
    }
  }
  if (cfg.appMode !== "paper" && cfg.appMode !== "live") errs.push("invalid app_mode");
  return errs;
}

export function displayMode(cfg: EdgeConfig, kill: boolean): "PAPER" | "LIVE DISABLED" | "LIVE ENABLED" {
  if (cfg.appMode !== "live" || !cfg.liveTradingEnabled || kill) {
    if (cfg.appMode === "live" && cfg.liveTradingEnabled && kill) return "LIVE DISABLED";
    if (cfg.appMode === "live") return "LIVE DISABLED";
    return "PAPER";
  }
  if (cfg.liveConfirmationPhrase !== LIVE_PHRASE) return "LIVE DISABLED";
  return "LIVE ENABLED";
}
