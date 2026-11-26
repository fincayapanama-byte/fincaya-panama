-- Circuito completo de avisos (push + centro de avisos):
--  * Vendedor: alguien toca el botón de WhatsApp de su anuncio.
--  * Admin: finca/vendedor nuevo, anuncio reportado, precio reportado, anuncios por vencer,
--    y recordatorio diario (7:30 a. m. Panamá) para publicar el post de precios.
--  * Cada aviso del admin se puede activar o desactivar desde el panel (Administración).
-- Seguro de ejecutar más de una vez. No borra ni cambia datos existentes.
-- Requiere haber desplegado antes la función "notify" actualizada.

-- ---------- Ajustes de avisos del admin ----------
create table if not exists public.admin_notify_settings (
  key         text primary key,
  label       text not null,
  description text,
  enabled     boolean not null default true,
  sort        int not null default 0,
  updated_at  timestamptz not null default now()
);
alter table public.admin_notify_settings enable row level security;
drop policy if exists "admin lee avisos" on public.admin_notify_settings;
create policy "admin lee avisos" on public.admin_notify_settings for select using (public.is_admin());
drop policy if exists "admin cambia avisos" on public.admin_notify_settings;
create policy "admin cambia avisos" on public.admin_notify_settings for update using (public.is_admin()) with check (public.is_admin());

insert into public.admin_notify_settings (key, label, description, sort) values
  ('listing_pending', 'Anuncios por aprobar',            'Cuando un usuario publica un anuncio nuevo.', 1),
  ('daily_prices',    'Recordatorio de precios del día', 'Cada mañana (7:30 a. m.), para publicar el post de precios en redes.', 2),
  ('new_farm',        'Nuevos registros',                'Cuando se registra una finca, productor o vendedor.', 3),
  ('listing_report',  'Reportes de anuncios',            'Cuando alguien reporta un anuncio por estafa, precio falso u otro motivo.', 4),
  ('price_report',    'Precios reportados',              'Cuando un productor reporta un precio que está por aprobar.', 5),
  ('listing_expiring','Anuncios por vencer',             'Resumen diario de anuncios que vencen en los próximos 3 días.', 6)
on conflict (key) do nothing;

-- ---------- Llamada interna a la función "notify" ----------
create or replace function public.fire_notify(payload jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://grxnghtgkrlgndwefptw.supabase.co/functions/v1/notify',
    body := payload,
    headers := '{"Content-Type":"application/json"}'::jsonb);
end $$;
revoke all on function public.fire_notify(jsonb) from public, anon, authenticated;

-- ---------- Vendedor: alguien tocó el botón de WhatsApp ----------
-- (misma lógica de contadores de antes; el dueño que prueba su propio botón no se avisa a sí mismo)
create or replace function public.track_listing(p_id uuid, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if p_kind = 'view' then
    update listings set views = views + 1 where id = p_id;
  elsif p_kind = 'contact' then
    update listings set contacts = contacts + 1 where id = p_id returning owner_id into v_owner;
    if v_owner is not null and v_owner is distinct from auth.uid() then
      perform public.fire_notify(jsonb_build_object('event', 'contact', 'listing_id', p_id));
    end if;
  end if;
end $$;

-- ---------- Admin: finca/vendedor nuevo ----------
create or replace function public.notify_farm_event() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.fire_notify(jsonb_build_object('event', 'farm_created', 'farm_id', new.id));
  return new;
end $$;
drop trigger if exists trg_notify_farm on public.farms;
create trigger trg_notify_farm after insert on public.farms
  for each row execute function public.notify_farm_event();

-- ---------- Admin: anuncio reportado ----------
create or replace function public.notify_report_event() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.fire_notify(jsonb_build_object('event', 'report_created', 'report_id', new.id));
  return new;
end $$;
drop trigger if exists trg_notify_report on public.reports;
create trigger trg_notify_report after insert on public.reports
  for each row execute function public.notify_report_event();

-- ---------- Admin: precio reportado por un productor (los oficiales del IMA no cuentan) ----------
create or replace function public.notify_price_event() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.fire_notify(jsonb_build_object('event', 'price_reported', 'price_id', new.id));
  return new;
end $$;
drop trigger if exists trg_notify_price on public.prices;
create trigger trg_notify_price after insert on public.prices
  for each row when (new.approved = false and new.created_by is not null)
  execute function public.notify_price_event();

-- ---------- Tareas diarias (hora de Panamá = UTC-5) ----------
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select cron.unschedule(jobid) from cron.job where jobname in ('aviso-precios-diarios', 'aviso-por-vencer');
-- 7:30 a. m. (12:30 UTC): después de la sincronización de precios del IMA de las 7:15 a. m.
select cron.schedule('aviso-precios-diarios', '30 12 * * *',
  $$select public.fire_notify('{"event":"daily_prices"}'::jsonb)$$);
-- 8:00 a. m. (13:00 UTC): resumen de anuncios por vencer
select cron.schedule('aviso-por-vencer', '0 13 * * *',
  $$select public.fire_notify('{"event":"expiring"}'::jsonb)$$);

-- Verificación (opcional):
-- select key, enabled from public.admin_notify_settings order by sort;   -- 6 filas
-- select jobname, schedule from cron.job where jobname like 'aviso-%';   -- 2 filas
