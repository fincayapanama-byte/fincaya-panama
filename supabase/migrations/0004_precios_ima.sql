-- Precios oficiales del IMA (SIPAN) sincronizados a diario
alter table public.prices add column if not exists price_min   numeric(12,2);
alter table public.prices add column if not exists price_max   numeric(12,2);
alter table public.prices add column if not exists origin      text;
alter table public.prices add column if not exists external_id text;
create unique index if not exists prices_external_id_key on public.prices (external_id);
create index if not exists prices_market_date on public.prices (market, date desc);

create table if not exists public.price_sync_log (
  id       bigserial primary key,
  ran_at   timestamptz not null default now(),
  source   text not null default 'IMA',
  days     int,
  upserted int,
  detail   jsonb
);
alter table public.price_sync_log enable row level security;
drop policy if exists "admin sync log" on public.price_sync_log;
create policy "admin sync log" on public.price_sync_log for select using (public.is_admin());

-- Resumen por producto: último precio, anterior y serie (para la tabla y la tendencia)
create or replace function public.prices_summary(p_days int default 30, p_market text default null)
returns table(product_slug text, product_name text, category_slug text, unit text, market text, province text,
              origin text, source text, source_url text, is_reference boolean, date date,
              price numeric, price_min numeric, price_max numeric, prev_price numeric, series numeric[])
language sql stable as $$
  with r as (
    select * from public.prices
    where approved and date >= current_date - p_days
      and (p_market is null or market = p_market)
  ), g as (
    select product_slug, unit, coalesce(province, '') pv, coalesce(market, '') mk, source,
           array_agg(price order by date, created_at) vals,
           (array_agg(id order by date desc, created_at desc))[1] last_id,
           (array_agg(price order by date desc, created_at desc))[2] prev
    from r group by 1, 2, 3, 4, 5
  )
  select p.product_slug, p.product_name, p.category_slug, p.unit, p.market, p.province, p.origin, p.source,
         p.source_url, p.is_reference, p.date, p.price, p.price_min, p.price_max, g.prev, g.vals
  from g join public.prices p on p.id = g.last_id
  order by p.product_name
$$;

create or replace function public.price_markets(p_days int default 30)
returns table(market text, n bigint, last date)
language sql stable as $$
  select market, count(*), max(date) from public.prices
  where approved and market is not null and date >= current_date - p_days
  group by market order by count(*) desc
$$;

grant execute on function public.prices_summary(int, text) to anon, authenticated;
grant execute on function public.price_markets(int) to anon, authenticated;

-- Tarea diaria: 7:15 a. m. y 12:15 p. m. hora de Panamá (12:15 y 17:15 UTC)
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select cron.unschedule(jobid) from cron.job where jobname in ('precios-ima-am', 'precios-ima-pm');
select cron.schedule('precios-ima-am', '15 12 * * *',
  $$select net.http_post(url := 'https://grxnghtgkrlgndwefptw.supabase.co/functions/v1/sync-precios-ima', body := '{}'::jsonb, headers := '{"Content-Type":"application/json"}'::jsonb)$$);
select cron.schedule('precios-ima-pm', '15 17 * * *',
  $$select net.http_post(url := 'https://grxnghtgkrlgndwefptw.supabase.co/functions/v1/sync-precios-ima', body := '{}'::jsonb, headers := '{"Content-Type":"application/json"}'::jsonb)$$);
