import { Navigate, createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { SignInGate } from "@/lib/auth/gates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="min-h-dvh bg-bg px-6 py-10 text-fg">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
          <div className="flex items-center gap-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Private desk</p>
            <Badge tone="paper">PAPER</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">EdgePilot</h1>
          <p className="mt-2 text-sm text-muted">
            Owner sign-in. Paper trading only until every live safety gate is satisfied. No
            profit is guaranteed. You can lose money.
          </p>
          <SignInGate
            fallback={
              <div className="mt-6 space-y-2">
                {authEnabled ? (
                  GROK_PROVIDERS.map((p) => (
                    <Button
                      key={p.providerId}
                      type="button"
                      variant="secondary"
                      className="w-full"
                      onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                    >
                      Continue with {p.label}
                    </Button>
                  ))
                ) : (
                  <p className="text-sm text-muted">Sign-in is disabled.</p>
                )}
              </div>
            }
          >
            <Navigate to="/" />
          </SignInGate>
        </div>
        <ul className="space-y-3 text-sm text-muted">
          <li className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
            <div className="font-medium text-fg">Paper first</div>
            Default mode is PAPER. Live HTTP orders stay disarmed in this version.
          </li>
          <li className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
            <div className="font-medium text-fg">Fees, buffer, depth</div>
            Spreads and triangles are measured after taker fees, slippage, and an uncertainty
            buffer — not on mid-price fiction.
          </li>
          <li className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
            <div className="font-medium text-fg">Thirteen live gates</div>
            Kill switch, notional caps, clock sync, confirmation phrase, and more. Any fail
            blocks live.
          </li>
        </ul>
        <p className="text-xs text-subtle">
          Simulated paper results are not real performance. DEX discrepancies are monitoring
          only. UTC clocks.
        </p>
      </div>
    </main>
  );
}
