import type Decimal from "decimal.js";

export type VenueId = "binance" | "bybit" | "dex";
export type Mode = "paper" | "live";
export type Side = "buy" | "sell";
export type OrderType = "market" | "limit";
export type SignalStatus = "accepted" | "rejected" | "blocked";
export type OrderStatus =
  | "new"
  | "accepted"
  | "partially_filled"
  | "filled"
  | "rejected"
  | "canceled";

export type CanonicalSymbol = "BTC/USDT" | "ETH/USDT" | "SOL/USDT" | "ETH/BTC" | "BTC/ETH";

export interface BookLevel {
  price: Decimal;
  qty: Decimal;
}

export interface BookSnapshot {
  venue: VenueId;
  symbol: CanonicalSymbol;
  bids: BookLevel[];
  asks: BookLevel[];
  tsMs: number;
  source: "live" | "fixture" | "rest";
}

export interface TickerSnapshot {
  venue: VenueId;
  symbol: CanonicalSymbol;
  bid: Decimal;
  ask: Decimal;
  last: Decimal;
  tsMs: number;
}

export interface MarketMeta {
  venue: VenueId;
  symbol: CanonicalSymbol;
  venueSymbol: string;
  base: string;
  quote: string;
  tickSize: Decimal;
  stepSize: Decimal;
  minQty: Decimal;
  minNotional: Decimal;
  status: "trading" | "halted" | "unknown";
  takerFee: Decimal;
}

export interface FillEstimate {
  qty: Decimal;
  vwap: Decimal;
  notional: Decimal;
  unfilled: Decimal;
  top: Decimal;
  slippageBps: Decimal;
  sufficient: boolean;
}

export interface SpreadResult {
  buyVenue: VenueId;
  sellVenue: VenueId;
  symbol: CanonicalSymbol;
  qty: Decimal;
  pBuy: Decimal;
  pSell: Decimal;
  fBuy: Decimal;
  fSell: Decimal;
  cFixed: Decimal;
  grossCost: Decimal;
  buyFee: Decimal;
  grossProceeds: Decimal;
  sellFee: Decimal;
  netProfit: Decimal;
  netRoi: Decimal;
  buySlippageBps: Decimal;
  sellSlippageBps: Decimal;
  reasons: string[];
  tradable: boolean;
}

export interface TriangleLeg {
  symbol: CanonicalSymbol;
  side: Side;
  qtyBase: Decimal;
  vwap: Decimal;
  fee: Decimal;
  quoteDelta: Decimal;
  baseDelta: Decimal;
}

export interface TriangleResult {
  path: string;
  startQuote: Decimal;
  finalQuote: Decimal;
  netProfit: Decimal;
  netRoi: Decimal;
  legs: TriangleLeg[];
  reasons: string[];
  tradable: boolean;
}

export interface DexQuote {
  provider: string;
  chain: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: Decimal;
  amountOut: Decimal;
  priceImpactBps: Decimal;
  gasEstimate: string | null;
  gasQuote: Decimal | null;
  route: string;
  tsMs: number;
  executable: false;
}

export interface Signal {
  id: string;
  strategyId: string;
  status: SignalStatus;
  symbol: string;
  expectedProfit: Decimal;
  expectedRoi: Decimal;
  confidence: "low" | "medium" | "high";
  reasons: string[];
  buyVenue?: VenueId;
  sellVenue?: VenueId;
  qty?: Decimal;
  dataTsMs: number;
  details: Record<string, string>;
  mode: Mode;
}

export interface RiskDecision {
  allow: boolean;
  reasons: string[];
  sizedQty?: Decimal;
}

export interface LiveGateResult {
  pass: boolean;
  failed: string[];
  checks: Record<string, boolean>;
}

export interface PaperOrderIntent {
  venue: VenueId;
  symbol: CanonicalSymbol;
  side: Side;
  type: OrderType;
  qty: Decimal;
  limitPrice?: Decimal;
  feeRate: Decimal;
  clientId: string;
  strategyId: string;
  signalId: string;
}

export const LIVE_PHRASE = "I_UNDERSTAND_LIVE_TRADING_CAN_LOSE_MONEY";

export const DEFAULT_PAIRS: CanonicalSymbol[] = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];
