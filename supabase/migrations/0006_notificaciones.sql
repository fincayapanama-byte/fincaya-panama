-- Notificaciones: centro de avisos en la app + notificaciones push (PWA)
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text,
  url        text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "mis avisos" on public.notifications;
create policy "mis avisos" on public.notifications for select using (user_id = auth.uid());
drop policy if exists "marcar leido" on public.notifications;
create policy "marcar leido" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "mis dispositivos" on public.push_subscriptions;
create policy "mis dispositivos" on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Claves internas (solo las lee la función con service role)
create table if not exists public.app_secrets (key text primary key, value jsonb not null, created_at timestamptz default now());
alter table public.app_secrets enable row level security;

-- Registro para no avisar dos veces lo mismo
create table if not exists public.notify_log (key text primary key, created_at timestamptz default now());
alter table public.notify_log enable row level security;

-- Disparadores: anuncio nuevo (avisa a admins) y cambio de estado (avisa al dueño)
create or replace function public.notify_listing_event() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare ev text;
begin
  if tg_op = 'INSERT' and new.status = 'pendiente' then ev := 'listing_created';
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and new.status in ('pendiente', 'aprobado', 'rechazado') then
    ev := case when new.status = 'pendiente' then 'listing_created' else 'listing_status' end;
  end if;
  if ev is not null then
    perform net.http_post(
      url := 'https://grxnghtgkrlgndwefptw.supabase.co/functions/v1/notify',
      body := jsonb_build_object('event', ev, 'listing_id', new.id),
      headers := '{"Content-Type":"application/json"}'::jsonb);
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_listing on public.listings;
create trigger trg_notify_listing after insert or update of status on public.listings
  for each row execute function public.notify_listing_event();

-- Comentario nuevo en redes (avisa al dueño del anuncio)
create or replace function public.notify_comment_event() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://grxnghtgkrlgndwefptw.supabase.co/functions/v1/notify',
    body := jsonb_build_object('event', 'comment', 'comment_id', new.id),
    headers := '{"Content-Type":"application/json"}'::jsonb);
  return new;
end $$;
drop trigger if exists trg_notify_comment on public.comments;
create trigger trg_notify_comment after insert on public.comments
  for each row execute function public.notify_comment_event();
