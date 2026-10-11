# EdgePilot Deployment Guide

## Hosted (this repository)

The operator console deploys as a TanStack Start app with Postgres. The platform injects `DATABASE_URL` and auth. Set `deploy.database` true (already). Do not write a `.env` here.

Preview uses embedded PGLite; data resets when the process restarts.

## Self-host on a small Linux VPS (optional)

### Compose services

`docker-compose.yml` provides:

- `app` — Node operator console on port 8080
- `postgres` — durable store
- optional `engine` — Python formula tests / future worker

### Steps

1. Provision Ubuntu LTS. Create a non-root user. Enable firewall (only 22/Tailscale).
2. Install Docker.
3. Clone the repo. Copy env from comments in compose — **never commit secrets**.
4. `docker compose up -d`
5. Run migrations (app start applies SQL).
6. Put Caddy/nginx in front with TLS **or** expose only on Tailscale (`tailscale serve`).
7. Basic-auth at the proxy is extra defense in depth; app auth still required.

### Logs

JSON to stdout. Configure Docker json-file rotation: `max-size=20m`, `max-file=5`.

### Backups

Nightly `pg_dump` to encrypted object storage. Test restore quarterly.

### Time

`chrony` or `systemd-timesyncd`. Live gate fails if clock drift exceeds 1s.

### Reverse proxy sketch (Caddy)

```
edgepilot.example {
  reverse_proxy 127.0.0.1:8080
}
```

Prefer Tailscale Funnel/serve so the dashboard is not on the public internet.
