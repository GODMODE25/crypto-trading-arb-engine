# EdgePilot Owner Checklist

Complete in order. Do not skip to live.

1. **API keys**  
   Create Binance and Bybit keys with **spot trading + read** only. Confirm withdrawal, internal transfer, universal transfer, futures, and margin are **off**.

2. **IP allowlisting**  
   Restrict each key to the VPS or home NAT IPv4. Update after any host change.

3. **Mode**  
   Leave the console in **PAPER**. Do not set the live confirmation phrase yet.

4. **Do not fund live trading**  
   Paper uses simulated balances. Do not deposit trading capital until you have reviewed paper expected-vs-realized over multiple sessions.

5. **Limits**  
   Keep the shipped low defaults (`max_order_notional` 75 USDT, daily loss 25 USDT) or **lower** them. Never raise them to “make the strategy fire.”

6. **Kill switch**  
   Press Disable new trading on Emergency. Confirm scans stop creating orders. Clear it.

7. **Local rules**  
   Confirm you may use the chosen exchanges from your country. Confirm how your tax authority treats crypto trades. EdgePilot does not do tax reporting.

8. **Monitoring**  
   Watch Overview + Risk daily. Optional: Telegram bot token + chat id.

9. **Backups**  
   If self-hosting: database dump + config (no secrets in the same archive).

10. **Rotate secrets**  
    Every 90 days or on suspicion. Revoke old keys before deleting them from env.

Only after 1–10, if you still want live:

- Set actual fee rates from the exchange UI.
- Pre-fund **both** venues if you enable inventory spread (EdgePilot will not transfer).
- Set `APP_MODE=live`, `LIVE_TRADING_ENABLED=true`, per-strategy and per-exchange flags, max order, max daily loss, and the confirmation phrase `I_UNDERSTAND_LIVE_TRADING_CAN_LOSE_MONEY`.
- Keep notional tiny. Watch the first live order in Orders. Trip the kill switch if anything is unexpected.

**There is no guaranteed profit. You can lose the entire allocated amount.**
