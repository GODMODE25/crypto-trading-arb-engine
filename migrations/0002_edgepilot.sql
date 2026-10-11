-- EdgePilot schema. All money as numeric. All rows scoped by user_id.

create table if not exists system_state (
  user_id text primary key,
  kill_switch boolean not null default false,
  app_mode text not null default 'paper',
  live_trading_enabled boolean not null default false,
  live_phrase_set boolean not null default false,
  consecutive_errors integer not null default 0,
  cooldown_until timestamptz,
  last_scan_at timestamptz,
  config_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists strategies (
  id text not null,
  user_id text not null,
  name text not null,
  kind text not null,
  enabled boolean not null default true,
  paused boolean not null default false,
  live_enabled boolean not null default false,
  mode text not null default 'paper',
  notes text not null default '',
  primary key (user_id, id)
);

create table if not exists strategy_configs (
  user_id text not null,
  strategy_id text not null,
  config_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, strategy_id)
);

create table if not exists exchanges (
  user_id text not null,
  id text not null,
  name text not null,
  trading_enabled boolean not null default false,
  key_configured boolean not null default false,
  withdrawal_permission_declared boolean not null default false,
  taker_fee numeric not null default 0.001,
  status text not null default 'idle',
  last_error text,
  last_ok_at timestamptz,
  primary key (user_id, id)
);

create table if not exists exchange_accounts (
  user_id text not null,
  exchange_id text not null,
  label text not null default 'primary',
  trading_enabled boolean not null default false,
  key_configured boolean not null default false,
  withdrawal_permission_declared boolean not null default false,
  primary key (user_id, exchange_id, label)
);

create table if not exists markets (
  user_id text not null,
  venue text not null,
  symbol text not null,
  venue_symbol text not null,
  base text not null,
  quote text not null,
  status text not null default 'trading',
  primary key (user_id, venue, symbol)
);

create table if not exists market_metadata (
  user_id text not null,
  venue text not null,
  symbol text not null,
  tick_size numeric not null,
  step_size numeric not null,
  min_qty numeric not null,
  min_notional numeric not null,
  taker_fee numeric not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, venue, symbol)
);

create table if not exists price_snapshots (
  id bigserial primary key,
  user_id text not null,
  venue text not null,
  market text not null,
  bid numeric not null,
  ask numeric not null,
  last numeric not null,
  ts timestamptz not null,
  source text not null default 'rest'
);
create index if not exists price_snapshots_user_ts_idx on price_snapshots (user_id, ts desc);
create index if not exists price_snapshots_user_mkt_idx on price_snapshots (user_id, venue, market);

create table if not exists orderbook_snapshots (
  id bigserial primary key,
  user_id text not null,
  venue text not null,
  market text not null,
  ts timestamptz not null,
  bids_json jsonb not null,
  asks_json jsonb not null,
  source text not null default 'rest'
);
create index if not exists orderbook_snapshots_user_ts_idx on orderbook_snapshots (user_id, ts desc);

create table if not exists signals (
  id text primary key,
  user_id text not null,
  strategy_id text not null,
  status text not null,
  symbol text not null,
  expected_profit numeric not null,
  expected_roi numeric not null,
  reasons text not null,
  details_json jsonb not null default '{}'::jsonb,
  mode text not null default 'paper',
  data_ts timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists signals_user_ts_idx on signals (user_id, created_at desc);
create index if not exists signals_user_strategy_idx on signals (user_id, strategy_id, status);

create table if not exists opportunities (
  id text primary key,
  user_id text not null,
  strategy_id text not null,
  symbol text not null,
  expected_profit numeric not null,
  expected_roi numeric not null,
  status text not null,
  explanation text not null,
  created_at timestamptz not null default now()
);
create index if not exists opportunities_user_ts_idx on opportunities (user_id, created_at desc);

create table if not exists orders (
  id text primary key,
  user_id text not null,
  venue text not null,
  market text not null,
  side text not null,
  order_type text not null,
  qty numeric not null,
  filled_qty numeric not null default 0,
  avg_price numeric,
  status text not null,
  reject_reason text,
  strategy_id text,
  signal_id text,
  mode text not null,
  created_at timestamptz not null default now()
);
create index if not exists orders_user_status_idx on orders (user_id, status);
create index if not exists orders_user_mode_idx on orders (user_id, mode);
create index if not exists orders_user_ts_idx on orders (user_id, created_at desc);

create table if not exists fills (
  id bigserial primary key,
  user_id text not null,
  order_id text not null,
  price numeric not null,
  qty numeric not null,
  fee numeric not null,
  fee_asset text not null,
  mode text not null,
  ts timestamptz not null default now()
);
create index if not exists fills_user_ts_idx on fills (user_id, ts desc);

create table if not exists positions (
  user_id text not null,
  mode text not null,
  venue text not null,
  asset text not null,
  qty numeric not null,
  avg_price numeric not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, mode, venue, asset)
);

create table if not exists balances (
  user_id text not null,
  mode text not null,
  venue text not null,
  asset text not null,
  free numeric not null,
  locked numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, mode, venue, asset)
);
create index if not exists balances_user_mode_idx on balances (user_id, mode);

create table if not exists transfers (
  id bigserial primary key,
  user_id text not null,
  venue text not null,
  asset text not null,
  amount numeric not null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists portfolio_snapshots (
  id bigserial primary key,
  user_id text not null,
  mode text not null,
  equity numeric not null,
  ts timestamptz not null default now()
);
create index if not exists portfolio_snapshots_user_ts_idx on portfolio_snapshots (user_id, ts desc);

create table if not exists pnl_records (
  id bigserial primary key,
  user_id text not null,
  mode text not null,
  kind text not null,
  amount numeric not null,
  note text not null,
  ts timestamptz not null default now()
);
create index if not exists pnl_records_user_mode_idx on pnl_records (user_id, mode, ts desc);

create table if not exists risk_events (
  id bigserial primary key,
  user_id text not null,
  severity text not null,
  kind text not null,
  message text not null,
  details_json jsonb not null default '{}'::jsonb,
  ts timestamptz not null default now()
);
create index if not exists risk_events_user_ts_idx on risk_events (user_id, ts desc);

create table if not exists system_events (
  id bigserial primary key,
  user_id text not null,
  kind text not null,
  message text not null,
  ts timestamptz not null default now()
);
create index if not exists system_events_user_ts_idx on system_events (user_id, ts desc);

create table if not exists alert_logs (
  id bigserial primary key,
  user_id text not null,
  kind text not null,
  message text not null,
  dedup_key text not null,
  ts timestamptz not null default now()
);
create index if not exists alert_logs_user_ts_idx on alert_logs (user_id, ts desc);

create table if not exists config_audit_logs (
  id bigserial primary key,
  user_id text not null,
  field text not null,
  old_value text,
  new_value text,
  ts timestamptz not null default now()
);
create index if not exists config_audit_logs_user_ts_idx on config_audit_logs (user_id, ts desc);
