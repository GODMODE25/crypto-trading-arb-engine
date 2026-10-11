import { d } from "../money.ts";
import type { DexQuote } from "../types.ts";

export interface DexQuoteRequest {
  chain: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  cexExecutable?: string;
}

export interface DexQuoteProvider {
  id: string;
  quote(req: DexQuoteRequest): Promise<DexQuote>;
}

/** Research-only fixture. Never executable. */
export class FixtureDexProvider implements DexQuoteProvider {
  id = "fixture-dex";
  async quote(req: DexQuoteRequest): Promise<DexQuote> {
    const amtIn = d(req.amountIn);
    // Pretend 8 bps worse than a 1:1 USDT stable swap, plus a gas stub.
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
      executable: false,
    };
  }
}

/**
 * Optional 1inch classic quote. Requires owner API key. Fail closed.
 * Never used for execution in MVP.
 */
export class OneInchQuoteProvider implements DexQuoteProvider {
  id = "1inch";
  private apiKey: string | undefined;
  constructor(apiKey: string | undefined) {
    this.apiKey = apiKey;
  }
  async quote(req: DexQuoteRequest): Promise<DexQuote> {
    if (!this.apiKey) {
      throw new Error("1inch API key not configured — research quotes unavailable");
    }
    const chainId = req.chain === "ethereum" ? "1" : req.chain;
    const url = `https://api.1inch.com/swap/v6.1/${chainId}/quote?src=${encodeURIComponent(req.tokenIn)}&dst=${encodeURIComponent(req.tokenOut)}&amount=${encodeURIComponent(req.amountIn)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${this.apiKey}` } });
    if (!res.ok) throw new Error(`1inch HTTP ${res.status}`);
    const json = (await res.json()) as { dstAmount?: string; gas?: number };
    const amtIn = d(req.amountIn);
    const amtOut = d(String(json.dstAmount ?? "0"));
    return {
      provider: this.id,
      chain: req.chain,
      tokenIn: req.tokenIn,
      tokenOut: req.tokenOut,
      amountIn: amtIn,
      amountOut: amtOut,
      priceImpactBps: d("0"),
      gasEstimate: json.gas != null ? String(json.gas) : null,
      gasQuote: null,
      route: "1inch-classic-v6.1",
      tsMs: Date.now(),
      executable: false,
    };
  }
}
