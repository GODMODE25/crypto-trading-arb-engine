# EdgePilot Security Model

Single owner. Not a SaaS. Still treated as hostile-network software.

## Authentication

- Dashboard requires a signed-in session (Grok gate / Google / X).
- Server functions use `authMiddleware`. Every row is scoped to `context.userId`.
- Never trust a client-supplied user id.

## Secrets

- Exchange API keys, Telegram bot tokens, live-confirmation phrase: **environment only**.
- Dashboard shows `configured` / `missing`, never the value.
- Logs run through a redactor: `apiKey`, `secret`, `token`, `phrase`, `password`, `authorization` → `[REDACTED]`.
- `.env` files are not used in this hosted environment. Self-host: env file with `0600` permissions, never in git.

## API keys (owner rules)

1. Spot trading + reading only.
2. Withdrawal **off**. Internal transfer **off**. Universal transfer **off**. Futures **off**.
3. IP allowlist to the VPS / NAT IP.
4. Separate keys per venue.
5. Rotate on any suspicion.

Live gate condition 6: `withdrawal_permission_declared = false`. If Binance `apiRestrictions.enableWithdrawals` is ever queried and true, **kill switch** and refuse live.

## Live trading

- 13-condition AND gate (see risk spec).
- No withdrawal, deposit, bridge, or transfer methods exist in brokers.
- Confirmation phrase is not displayed after save.

## Kill switch

Any authenticated owner session can trip it. Automatic trips persist until manually cleared.

## Dashboard exposure

- Default bind is not public. Self-host behind Tailscale or a reverse proxy with auth.
- This hosted preview is already behind Grok’s gate for the owner.
- CSRF: same-origin server functions + Better Auth cookies. Do not weaken `trustedOrigins`.

## Injection / XSS

- Parameterized SQL only.
- React text interpolation (no `dangerouslySetInnerHTML` for logs).
- No eval of strategy code.

## Dependencies

Pin known packages. Do not run untrusted strategy plugins in-process in MVP.
