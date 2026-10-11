# EdgePilot Operational Runbook

## Daily

1. Open Overview. Confirm mode badge is **PAPER** unless you intentionally enabled live.
2. Check kill-switch state (green = trading allowed for paper; red = halted).
3. Read overnight risk events and rejected signals. Fee-negative spreads are normal.
4. Confirm last scan timestamp is recent (UTC).
5. Glance at paper vs live PnL — they must never match by coincidence in the same card.

## If feeds fail

- Health page shows adapter errors.
- Scan uses last good snapshot only if still fresh; otherwise strategies emit `stale_data` rejects.
- After `max_consecutive_errors`, kill switch auto-trips.

## If a live order was attempted and blocked

Expected. Read the `risk_events` row for the failed gate names. Do not “force” the order.

## If kill switch is on

1. New orders stop.
2. Investigate the triggering event.
3. Do **not** flatten unless you have a separate reason; default is hold.
4. Clear the switch only after the cause is understood.

## Paper demo

Use **Run fixture suite** on Overview. It injects six canonical cases without touching live markets.

## Backup (self-host)

- `pg_dump` daily; encrypt off-box.
- Copy `configs/` without secrets.
- Rotate keys after restore onto a new IP (update allowlists).

## Shutdown

Stop the process. Paper state in preview is in-memory and will reset. Deployed Neon persists.
