import { LIVE_PHRASE, type LiveGateResult, type RiskDecision, type Signal } from "./types.ts";
import type { EdgeConfig } from "./config.ts";
import { d } from "./money.ts";

export interface RiskSnapshot {
  killSwitch: boolean;
  consecutiveErrors: number;
  dailyRealizedPnl: string;
  equity: string;
  peakEquity: string;
  openOrders: number;
  openPositions: number;
  cooldownUntilMs: number;
  nowMs: number;
  dataAgeMs: number;
  clockDriftMs: number;
  feesConfigured: boolean;
  marketTrading: boolean;
  strategyPaused: boolean;
  strategyLiveEnabled: boolean;
  exchangeTradingEnabled: boolean;
  apiKeyConfigured: boolean;
  withdrawalPermission: boolean;
  riskEngineHealthy: boolean;
}

export function evaluateLiveGate(cfg: EdgeConfig, snap: RiskSnapshot): LiveGateResult {
  const checks: Record<string, boolean> = {
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
    "13_kill_switch_off": !snap.killSwitch,
  };
  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  return { pass: failed.length === 0, failed, checks };
}

export function reviewSignal(
  signal: Signal,
  cfg: EdgeConfig,
  snap: RiskSnapshot,
): RiskDecision {
  const reasons: string[] = [];
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
    if (equity.gt(0) && daily.div(equity).mul(d("100")).lte(d(cfg.maxDailyLossPct).neg())) {
      reasons.push("max_daily_loss_pct");
    }
    if (peak.gt(0)) {
      const dd = peak.sub(equity).div(peak).mul(d("100"));
      if (dd.gte(d(cfg.maxDrawdownPct))) reasons.push("max_drawdown");
    }
    if (signal.expectedProfit.gt(0)) {
      const orderNotional = signal.qty ? signal.qty : d("0");
      if (orderNotional.gt(0) && signal.details.grossCost) {
        if (d(signal.details.grossCost).gt(d(cfg.maxOrderNotional))) {
          reasons.push("max_order_notional");
        }
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

  return { allow: reasons.length === 0, reasons };
}

export function shouldAutoKill(cfg: EdgeConfig, snap: RiskSnapshot): boolean {
  if (snap.consecutiveErrors >= cfg.maxConsecutiveErrors) return true;
  try {
    if (d(snap.dailyRealizedPnl).lt(d(cfg.maxDailyLossAbs).neg())) return true;
    const equity = d(snap.equity);
    const peak = d(snap.peakEquity);
    if (peak.gt(0) && peak.sub(equity).div(peak).mul(d("100")).gte(d(cfg.maxDrawdownPct))) {
      return true;
    }
  } catch {
    return true;
  }
  return false;
}
