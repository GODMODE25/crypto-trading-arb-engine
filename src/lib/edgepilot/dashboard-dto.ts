import { DEFAULT_CONFIG, type EdgeConfig } from "./config.ts";

export type DashboardDto = {
  mode: string;
  killSwitch: boolean;
  lastScan: string | null;
  paperEquity: string;
  liveEquity: string;
  paperPnl: string;
  livePnl: string;
  openPaperOrders: number;
  signalsToday: number;
  accepted: number;
  rejected: number;
  riskCount: number;
  consecutiveErrors: number;
  liveGateFailed: string[];
  strategies: {
    id: string;
    name: string;
    kind: string;
    enabled: boolean;
    paused: boolean;
    liveEnabled: boolean;
    notes: string;
  }[];
  exchanges: {
    id: string;
    name: string;
    status: string;
    lastError: string | null;
    lastOk: string | null;
    tradingEnabled: boolean;
    keyConfigured: boolean;
  }[];
  signals: Record<string, string>[];
  opportunities: Record<string, string>[];
  orders: Record<string, string>[];
  fills: Record<string, string>[];
  paperBalances: Record<string, string>[];
  liveBalances: Record<string, string>[];
  pnl: Record<string, string>[];
  riskEvents: Record<string, string>[];
  systemEvents: Record<string, string>[];
  alerts: Record<string, string>[];
  audit: Record<string, string>[];
  config: EdgeConfig;
  disclaimer: string;
};

export const EMPTY_LIVE_GATES = [
  "1_app_mode_live",
  "2_live_trading_enabled",
  "3_strategy_live_enabled",
  "4_exchange_trading_enabled",
  "5_api_key_configured",
  "6_no_withdrawal_permission",
  "7_max_order_notional_set",
  "8_max_daily_loss_set",
  "9_risk_engine_healthy",
  "10_market_data_fresh",
  "11_clock_sync",
  "12_confirmation_phrase",
  "13_kill_switch_off",
];

export function emptyDashboard(patch: Partial<DashboardDto> = {}): DashboardDto {
  return {
    mode: "PAPER",
    killSwitch: false,
    lastScan: null,
    paperEquity: "0.00",
    liveEquity: "0.00",
    paperPnl: "est. vs seed — see PnL page",
    livePnl: "0.00 (no live trades)",
    openPaperOrders: 0,
    signalsToday: 0,
    accepted: 0,
    rejected: 0,
    riskCount: 0,
    consecutiveErrors: 0,
    liveGateFailed: EMPTY_LIVE_GATES.filter((k) => k !== "7_max_order_notional_set" && k !== "8_max_daily_loss_set" && k !== "13_kill_switch_off"),
    strategies: [
      {
        id: "spread",
        name: "Multi-CEX inventory spread",
        kind: "spread",
        enabled: true,
        paused: false,
        liveEnabled: false,
        notes: "Paper trader. Pre-funded inventory on Binance and Bybit. No transfers.",
      },
      {
        id: "triangle",
        name: "Binance triangular scanner",
        kind: "triangle",
        enabled: true,
        paused: false,
        liveEnabled: false,
        notes: "USDT triangles on Binance spot. Paper only by default.",
      },
      {
        id: "dex_monitor",
        name: "CEX/DEX discrepancy monitor",
        kind: "dex_monitor",
        enabled: true,
        paused: false,
        liveEnabled: false,
        notes: "MONITORING ONLY. Never executes swaps.",
      },
    ],
    exchanges: [
      {
        id: "binance",
        name: "Binance Spot",
        status: "idle",
        lastError: null,
        lastOk: null,
        tradingEnabled: false,
        keyConfigured: false,
      },
      {
        id: "bybit",
        name: "Bybit Spot",
        status: "idle",
        lastError: null,
        lastOk: null,
        tradingEnabled: false,
        keyConfigured: false,
      },
    ],
    signals: [],
    opportunities: [],
    orders: [],
    fills: [],
    paperBalances: [],
    liveBalances: [],
    pnl: [],
    riskEvents: [],
    systemEvents: [],
    alerts: [],
    audit: [],
    config: { ...DEFAULT_CONFIG, liveConfirmationPhrase: "" },
    disclaimer:
      "No strategy guarantees profit. Paper results are simulated. Live trading is disabled unless every safety gate passes. You can lose money.",
    ...patch,
  };
}
