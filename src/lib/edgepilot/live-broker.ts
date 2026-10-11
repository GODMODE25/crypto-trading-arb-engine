import type { EdgeConfig } from "./config.ts";
import { evaluateLiveGate, type RiskSnapshot } from "./risk.ts";
import type { PaperOrderIntent } from "./types.ts";

export interface LiveAttempt {
  blocked: true;
  failed: string[];
  message: string;
}

/**
 * Live broker is a fail-closed placeholder. It never sends HTTP unless the
 * gate passes — and even then MVP still refuses unless an explicit
 * experimental flag is set (always false in this build).
 */
export function attemptLiveOrder(
  cfg: EdgeConfig,
  snap: RiskSnapshot,
  _intent: PaperOrderIntent,
): LiveAttempt {
  const gate = evaluateLiveGate(cfg, snap);
  if (!gate.pass) {
    return {
      blocked: true,
      failed: gate.failed,
      message: "Live order blocked by safety gate: " + gate.failed.join(", "),
    };
  }
  return {
    blocked: true,
    failed: ["mvp_live_execution_not_armed"],
    message:
      "Live gate passed but MVP live execution is not armed. Paper-only delivery. No HTTP order was sent.",
  };
}
