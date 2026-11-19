-- Publicaciones de marca: el admin publica desde la plataforma en Facebook/Instagram de FincaYa
create table if not exists public.brand_posts (
  id          uuid primary key default gen_random_uuid(),
  message     text not null,
  image_url   text,
  networks    text[] not null default '{facebook,instagram}',
  results     jsonb not null default '{}',
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
alter table public.brand_posts enable row level security;
create policy "admin publicaciones marca" on public.brand_posts for all using (public.is_admin()) with check (public.is_admin());
