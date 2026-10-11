import Decimal from "decimal.js";

/** Financial arithmetic. Never pass IEEE-754 numbers into money constructors. */
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN });

export type Money = Decimal;

const SECRETISH =
  /api[_-]?key|secret|token|password|authorization|phrase|private[_-]?key|chat[_-]?id/i;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

export function d(value: string | Decimal): Decimal {
  if (value instanceof Decimal) {
    if (!value.isFinite()) throw new MoneyError("non-finite Decimal");
    return value;
  }
  if (typeof value !== "string") {
    throw new MoneyError("money values must be Decimal or decimal string");
  }
  const trimmed = value.trim();
  if (!trimmed || /[eE]/.test(trimmed) === false && !/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) {
      throw new MoneyError(`invalid decimal string: ${trimmed}`);
    }
  }
  const n = new Decimal(trimmed);
  if (!n.isFinite()) throw new MoneyError("non-finite Decimal");
  return n;
}

/** Integer counts only (levels, ids). Rejects non-integers. */
export function intStr(n: number): string {
  if (!Number.isInteger(n) || !Number.isSafeInteger(n)) {
    throw new MoneyError("unsafe integer");
  }
  return String(n);
}

export const ZERO = d("0");
export const ONE = d("1");
export const BPS = d("10000");

export function isPositive(x: Decimal): boolean {
  return x.gt(0);
}

export function maxD(...xs: Decimal[]): Decimal {
  return xs.reduce((a, b) => (a.gt(b) ? a : b));
}

export function minD(...xs: Decimal[]): Decimal {
  return xs.reduce((a, b) => (a.lt(b) ? a : b));
}

export function moneyStr(x: Decimal, dp = 8): string {
  return x.toFixed(dp);
}

export function roiStr(x: Decimal): string {
  return x.mul(d("100")).toFixed(4) + "%";
}

/** Floor to a positive step size (never overstate output). */
export function floorToStep(qty: Decimal, step: Decimal): Decimal {
  if (!step.gt(0)) throw new MoneyError("step must be positive");
  if (qty.lte(0)) return ZERO;
  return qty.div(step).toDecimalPlaces(0, Decimal.ROUND_DOWN).mul(step);
}

/** Round price to tick (down for sells of quote benefit conservatism on buy prices). */
export function floorToTick(price: Decimal, tick: Decimal): Decimal {
  if (!tick.gt(0)) throw new MoneyError("tick must be positive");
  return price.div(tick).toDecimalPlaces(0, Decimal.ROUND_DOWN).mul(tick);
}

export function redactSecrets(input: unknown): unknown {
  if (typeof input === "string") {
    return SECRETISH.test(input) ? "[REDACTED]" : input;
  }
  if (Array.isArray(input)) return input.map(redactSecrets);
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = SECRETISH.test(k) ? "[REDACTED]" : redactSecrets(v);
    }
    return out;
  }
  return input;
}

export function redactText(line: string): string {
  return line
    .replace(/(api[_-]?key|secret|token|password|authorization|phrase)\s*[:=]\s*\S+/gi, "$1=[REDACTED]")
    .replace(/bot\d+:[A-Za-z0-9_-]+/g, "bot[REDACTED]");
}
