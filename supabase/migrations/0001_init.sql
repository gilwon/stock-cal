-- sc_portfolios
create table sc_portfolios (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  name          text not null default 'My Portfolio',
  base_currency text not null default 'KRW' check (base_currency in ('KRW', 'USD')),
  created_at    timestamptz not null default now()
);

alter table sc_portfolios enable row level security;

create policy "owner access" on sc_portfolios
  using (auth.uid() = user_id or user_id is null);

-- sc_holdings
create table sc_holdings (
  id            uuid primary key default gen_random_uuid(),
  portfolio_id  uuid not null references sc_portfolios(id) on delete cascade,
  ticker        text not null,
  name          text not null,
  market        text not null check (market in ('KR', 'US')),
  quantity      numeric not null check (quantity > 0),
  avg_price     numeric not null check (avg_price > 0),
  currency      text not null check (currency in ('KRW', 'USD')),
  created_at    timestamptz not null default now()
);

alter table sc_holdings enable row level security;

create policy "owner access" on sc_holdings
  using (
    exists (
      select 1 from sc_portfolios p
      where p.id = portfolio_id
        and (p.user_id = auth.uid() or p.user_id is null)
    )
  );

-- sc_price_cache (no RLS needed - public read/write for caching)
create table sc_price_cache (
  ticker      text primary key,
  price       numeric not null,
  currency    text not null,
  name        text not null,
  updated_at  timestamptz not null default now()
);
