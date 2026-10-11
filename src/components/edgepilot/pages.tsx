import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDash } from "@/lib/edgepilot/use-dashboard.ts";
import { fmtPct, fmtTs, statusTone } from "./format.ts";
import { PageHeader, Panel, Stat } from "./shell.tsx";
import { BusyBar, Callout, DataTable } from "./table.tsx";
import { DEFAULT_CONFIG } from "@/lib/edgepilot/config.ts";

function GateList({ failed }: { failed: string[] }) {
  return (
    <ul className="space-y-1 font-mono text-xs text-muted">
      {(
        [
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
        ] as const
      ).map((k) => {
        const ok = !failed.includes(k);
        return (
          <li key={k} className="flex items-center gap-2">
            <span className={ok ? "text-gain" : "text-loss"}>{ok ? "pass" : "fail"}</span>
            <span>{k.replace(/^\d+_/, "").replaceAll("_", " ")}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function OverviewPage() {
  const { data, busy, error, runFixtures, runScan, kill } = useDash();
  if (!data) return <p className="text-muted">Loading desk…</p>;
  return (
    <>
      <PageHeader
        kicker="Capital preservation first"
        title="Overview"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => void runFixtures()} disabled={!!busy}>
              Run fixture suite
            </Button>
            <Button size="sm" onClick={() => void runScan()} disabled={!!busy}>
              Scan public books
            </Button>
            <Button size="sm" variant="danger" onClick={() => void kill(true)} disabled={!!busy}>
              Kill switch
            </Button>
          </div>
        }
      />
      <BusyBar label={busy} />
      {error ? <p className="mb-4 text-sm text-loss">{error}</p> : null}
      <Callout>{data.disclaimer}</Callout>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Mode" value={data.mode} hint={data.killSwitch ? "New orders halted" : "Paper execution allowed"} />
        <Stat label="Paper equity (USDT)" value={data.paperEquity} hint="Mark-to-market, simulated" />
        <Stat label="Live equity (USDT)" value={data.liveEquity} hint="No live fills" tone="muted" />
        <Stat label="Signals stored" value={String(data.signalsToday)} hint={`${data.accepted} accepted · ${data.rejected} rejected`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Live safety gate (all must pass)">
          <GateList failed={data.liveGateFailed} />
        </Panel>
        <Panel title="Venues">
          <ul className="space-y-3">
            {data.exchanges.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{e.name}</div>
                  <div className="text-xs text-muted">
                    Trading {e.tradingEnabled ? "on" : "off"} · key {e.keyConfigured ? "configured" : "not set"}
                  </div>
                  {e.lastError ? <div className="text-xs text-loss">{e.lastError}</div> : null}
                </div>
                <Badge tone={e.status === "ok" ? "ok" : e.status === "error" ? "loss" : "neutral"}>{e.status}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-subtle">Last scan: {fmtTs(data.lastScan)}</p>
        </Panel>
      </div>
      <Panel title="Latest signals" className="mt-4">
        <DataTable
          empty="No signals yet. Run the fixture suite."
          columns={[
            { key: "created_at", label: "UTC", mono: true },
            { key: "strategy_id", label: "Strategy" },
            { key: "symbol", label: "Market" },
            { key: "status", label: "Status" },
            { key: "expected_profit", label: "E[PnL]", mono: true },
            { key: "reasons", label: "Reasons" },
          ]}
          rows={data.signals.slice(0, 8)}
        />
      </Panel>
    </>
  );
}

export function StrategiesPage() {
  const { data, busy, setStrategy } = useDash();
  if (!data) return null;
  return (
    <>
      <PageHeader kicker="Independent modules" title="Strategies" />
      <BusyBar label={busy} />
      <div className="grid gap-4">
        {data.strategies.map((s) => (
          <Panel key={s.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium tracking-tight">{s.name}</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted">{s.notes}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={s.enabled ? "ok" : "neutral"}>{s.enabled ? "enabled" : "disabled"}</Badge>
                  <Badge tone={s.paused ? "warn" : "neutral"}>{s.paused ? "paused" : "running"}</Badge>
                  <Badge tone="paper">live forced off</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => void setStrategy(s.id, !s.paused)}>
                  {s.paused ? "Resume" : "Pause"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void setStrategy(s.id, undefined, !s.enabled)}>
                  {s.enabled ? "Disable" : "Enable"}
                </Button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}

export function OpportunitiesPage() {
  const { data } = useDash();
  if (!data) return null;
  return (
    <>
      <PageHeader kicker="Expected vs rejected" title="Opportunities & signals" />
      <Callout>
        Accepted means the paper path may place simulated legs. Rejected/blocked never become live orders. DEX rows are
        monitoring only.
      </Callout>
      <Panel className="mt-4" title="Opportunities">
        <DataTable
          empty="Empty. Run fixtures or a market scan."
          columns={[
            { key: "created_at", label: "UTC", mono: true },
            { key: "strategy_id", label: "Strategy" },
            { key: "symbol", label: "Path" },
            { key: "status", label: "Status" },
            { key: "expected_profit", label: "E[profit]", mono: true },
            { key: "expected_roi", label: "E[ROI]", mono: true },
            { key: "explanation", label: "Why" },
          ]}
          rows={data.opportunities.map((r) => ({
            ...r,
            expected_roi: fmtPct(r.expected_roi),
            status: r.status + (statusTone(r.status) === "ok" ? "" : ""),
          }))}
        />
      </Panel>
    </>
  );
}

export function PaperPage() {
  const { data, resetPaper, busy } = useDash();
  if (!data) return null;
  return (
    <>
      <PageHeader
        kicker="Simulated inventory"
        title="Paper portfolio"
        actions={
          <Button size="sm" variant="secondary" onClick={() => void resetPaper()} disabled={!!busy}>
            Reset inventory
          </Button>
        }
      />
      <Callout>
        Paper balances are not exchange balances. Estimated PnL is not realized banked profit. Live book is separate.
      </Callout>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Stat label="Paper equity USDT" value={data.paperEquity} hint="MTM using last ask or fixture marks" />
        <Stat label="Open paper orders" value={String(data.openPaperOrders)} />
      </div>
      <Panel className="mt-4" title="Per-venue paper balances">
        <DataTable
          empty="No paper balances."
          columns={[
            { key: "venue", label: "Venue" },
            { key: "asset", label: "Asset" },
            { key: "free", label: "Free", mono: true },
            { key: "locked", label: "Locked", mono: true },
          ]}
          rows={data.paperBalances}
        />
      </Panel>
    </>
  );
}

export function LivePage() {
  const { data } = useDash();
  if (!data) return null;
  return (
    <>
      <PageHeader kicker="Empty until gates pass" title="Live portfolio" />
      <Callout>
        Live ledger is isolated from paper. This MVP does not arm HTTP order placement even if you flip config flags.
        Failed live-gate names are listed below.
      </Callout>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Stat label="Live equity USDT" value={data.liveEquity} hint="No live positions" />
        <Stat label="Live PnL" value={data.livePnl} />
      </div>
      <Panel className="mt-4" title="Live balances">
        <DataTable
          empty="No live balances — as designed."
          columns={[
            { key: "venue", label: "Venue" },
            { key: "asset", label: "Asset" },
            { key: "free", label: "Free", mono: true },
          ]}
          rows={data.liveBalances}
        />
      </Panel>
      <Panel className="mt-4" title="Gate failures">
        <GateList failed={data.liveGateFailed} />
      </Panel>
    </>
  );
}

export function OrdersPage() {
  const { data } = useDash();
  if (!data) return null;
  return (
    <>
      <PageHeader kicker="Lifecycle" title="Orders & fills" />
      <Panel title="Orders">
        <DataTable
          empty="No orders. A valid fixture spread will create two paper legs."
          columns={[
            { key: "created_at", label: "UTC", mono: true },
            { key: "mode", label: "Mode" },
            { key: "venue", label: "Venue" },
            { key: "market", label: "Market" },
            { key: "side", label: "Side" },
            { key: "qty", label: "Qty", mono: true },
            { key: "avg_price", label: "Avg", mono: true },
            { key: "status", label: "Status" },
            { key: "reject_reason", label: "Reject" },
          ]}
          rows={data.orders}
        />
      </Panel>
      <Panel className="mt-4" title="Fills">
        <DataTable
          empty="No fills yet."
          columns={[
            { key: "ts", label: "UTC", mono: true },
            { key: "mode", label: "Mode" },
            { key: "order_id", label: "Order" },
            { key: "qty", label: "Qty", mono: true },
            { key: "price", label: "Price", mono: true },
            { key: "fee", label: "Fee", mono: true },
            { key: "fee_asset", label: "Fee asset" },
          ]}
          rows={data.fills}
        />
      </Panel>
    </>
  );
}

export function PnlPage() {
  const { data } = useDash();
  if (!data) return null;
  return (
    <>
      <PageHeader kicker="Never mix ledgers" title="PnL & performance" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Paper (simulated)" value={data.paperEquity} hint="Equity, not a return promise" />
        <Stat label="Live (real)" value={data.liveEquity} hint="Remains zero until a gated live fill exists" />
      </div>
      <Panel className="mt-4" title="PnL records">
        <DataTable
          empty="No PnL rows yet. Paper fills still move balances — records appear after scans."
          columns={[
            { key: "ts", label: "UTC", mono: true },
            { key: "mode", label: "Mode" },
            { key: "kind", label: "Kind" },
            { key: "amount", label: "Amount", mono: true },
            { key: "note", label: "Note" },
          ]}
          rows={data.pnl}
        />
      </Panel>
    </>
  );
}

export function RiskPage() {
  const { data } = useDash();
  if (!data) return null;
  return (
    <>
      <PageHeader kicker="Audit" title="Risk events & logs" />
      <Panel title="Risk events">
        <DataTable
          empty="No risk events."
          columns={[
            { key: "ts", label: "UTC", mono: true },
            { key: "severity", label: "Severity" },
            { key: "kind", label: "Kind" },
            { key: "message", label: "Message" },
          ]}
          rows={data.riskEvents}
        />
      </Panel>
      <Panel className="mt-4" title="System events">
        <DataTable
          empty="No system events."
          columns={[
            { key: "ts", label: "UTC", mono: true },
            { key: "kind", label: "Kind" },
            { key: "message", label: "Message" },
          ]}
          rows={data.systemEvents}
        />
      </Panel>
      <Panel className="mt-4" title="Alerts (deduped)">
        <DataTable
          empty="No alerts."
          columns={[
            { key: "ts", label: "UTC", mono: true },
            { key: "kind", label: "Kind" },
            { key: "message", label: "Message" },
          ]}
          rows={data.alerts}
        />
      </Panel>
    </>
  );
}

export function ConfigPage() {
  const { data, saveConfig, busy } = useDash();
  if (!data) return null;
  const c = data.config;
  return (
    <>
      <PageHeader kicker="Fail closed" title="Configuration" />
      <Callout>
        Live confirmation phrase is never shown. Telegram tokens are never stored in this view. Defaults match{" "}
        {DEFAULT_CONFIG.maxOrderNotional} USDT max order.
      </Callout>
      <Panel className="mt-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          {Object.entries(c)
            .filter(([k]) => k !== "liveConfirmationPhrase")
            .map(([k, v]) => (
              <div key={k} className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2">
                <dt className="text-[11px] uppercase tracking-[0.12em] text-subtle">{k}</dt>
                <dd className="font-mono text-sm tabular-nums">{String(v)}</dd>
              </div>
            ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={!!busy}
            onClick={() => void saveConfig({ maxOrderNotional: "50" })}
          >
            Tighten max order to 50 USDT
          </Button>
          <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => void saveConfig({ appMode: "paper" })}>
            Force PAPER mode
          </Button>
        </div>
      </Panel>
      <Panel className="mt-4" title="Config audit">
        <DataTable
          empty="No config edits yet."
          columns={[
            { key: "ts", label: "UTC", mono: true },
            { key: "field", label: "Field" },
            { key: "old_value", label: "From" },
            { key: "new_value", label: "To" },
          ]}
          rows={data.audit}
        />
      </Panel>
    </>
  );
}

export function HealthPage() {
  const { data, runScan, busy } = useDash();
  if (!data) return null;
  return (
    <>
      <PageHeader
        kicker="Readiness"
        title="System health"
        actions={
          <Button size="sm" onClick={() => void runScan()} disabled={!!busy}>
            Ping venues
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Kill switch" value={data.killSwitch ? "ARMED" : "clear"} />
        <Stat label="Consecutive errors" value={String(data.consecutiveErrors)} />
        <Stat label="Last scan" value={data.lastScan ? fmtTs(data.lastScan) : "never"} />
      </div>
      <Panel className="mt-4" title="Adapters">
        <ul className="space-y-2 text-sm">
          {data.exchanges.map((e) => (
            <li key={e.id} className="flex justify-between gap-3 border-b border-border py-2">
              <span>{e.name}</span>
              <span className="font-mono text-xs text-muted">
                {e.status}
                {e.lastOk ? ` · ${fmtTs(e.lastOk)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

export function EmergencyPage() {
  const { data, kill, busy } = useDash();
  if (!data) return null;
  return (
    <>
      <PageHeader kicker="Highest priority" title="Emergency controls" />
      <Panel>
        <p className="max-w-xl text-sm text-muted">
          Disable new trading immediately. Open paper/live orders are not market-closed (forced flattening can lock
          losses). Live cancels run only if a live adapter is later armed.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="danger" onClick={() => void kill(true)} disabled={!!busy || data.killSwitch}>
            Disable new trading
          </Button>
          <Button variant="secondary" onClick={() => void kill(false)} disabled={!!busy || !data.killSwitch}>
            Clear kill switch
          </Button>
        </div>
        <p className="mt-4 font-mono text-xs text-subtle">State: {data.killSwitch ? "ARMED" : "clear"} · mode {data.mode}</p>
      </Panel>
    </>
  );
}
