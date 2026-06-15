create table sc_signal_cache (
  ticker      text primary key,
  signal      text not null check (signal in ('buy','hold','sell')),
  score       integer not null,
  indicators  jsonb not null,
  updated_at  timestamptz not null default now()
);
