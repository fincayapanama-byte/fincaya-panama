-- =====================================================================
-- Directorio agropecuario de Panamá — esquema inicial (Fase 1 + base Fase 2/3)
-- Ejecutar en Supabase: SQL Editor → pegar → Run
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Perfiles y roles ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  whatsapp    text,
  role        text not null default 'productor' check (role in ('productor','admin')),
  blocked     boolean not null default false,
  created_at  timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Crear perfil automáticamente al registrarse
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Categorías ----------
create table public.categories (
  slug        text primary key,
  name        text not null,
  parent_slug text references public.categories(slug),
  sort        int not null default 0
);

-- ---------- Fincas ----------
create table public.farms (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  slug        text not null unique,
  name        text not null,
  description text,
  province    text not null,
  district    text,
  address     text,
  lat         double precision,
  lng         double precision,
  whatsapp    text,
  phone       text,
  email       text,
  instagram   text,
  tiktok      text,
  facebook    text,
  website     text,
  logo_url    text,
  cover_url   text,
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on public.farms (province);

-- ---------- Anuncios ----------
create table public.listings (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid not null references public.farms(id) on delete cascade,
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  slug          text not null unique,
  category_slug text not null references public.categories(slug),
  title         text not null,
  description   text,
  breed         text,
  price         numeric(12,2),
  unit          text not null default 'unidad',      -- unidad, libra, quintal, saco, cabeza, kg
  quantity      int,
  province      text not null,
  district      text,
  images        text[] not null default '{}',
  status        text not null default 'pendiente'
                check (status in ('pendiente','aprobado','rechazado','vendido','vencido')),
  reject_reason text,
  featured      boolean not null default false,
  views         int not null default 0,
  contacts      int not null default 0,
  expires_at    timestamptz not null default now() + interval '30 days',
  created_at    timestamptz not null default now(),
  approved_at   timestamptz
);
create index on public.listings (status, category_slug, province);
create index on public.listings (owner_id);

-- ---------- Precios de mercado ----------
create table public.prices (
  id           uuid primary key default gen_random_uuid(),
  product_slug text not null,
  product_name text not null,
  category_slug text references public.categories(slug),
  unit         text not null,
  market       text,                 -- Merca Panamá, subasta, finca, etc.
  province     text,
  price        numeric(12,2) not null,
  source       text not null,        -- INEC, Acodeco, Reporte productor, Plataforma (referencia)
  source_url   text,
  is_reference boolean not null default false,  -- true = calculado de anuncios, no oficial
  date         date not null default current_date,
  created_by   uuid references public.profiles(id),
  approved     boolean not null default true,
  created_at   timestamptz not null default now()
);
create index on public.prices (product_slug, date desc);

-- Precio de referencia diario: mediana de anuncios aprobados (se guarda con un cron, ver README)
create or replace function public.snapshot_reference_prices() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.prices (product_slug, product_name, category_slug, unit, province, price, source, is_reference, date)
  select l.category_slug, c.name, l.category_slug, l.unit, l.province,
         percentile_cont(0.5) within group (order by l.price), 'Plataforma (referencia)', true, current_date
  from public.listings l join public.categories c on c.slug = l.category_slug
  where l.status = 'aprobado' and l.price is not null
  group by l.category_slug, c.name, l.unit, l.province
  having count(*) >= 3;   -- mínimo 3 anuncios para no exponer el precio de una sola finca
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- Redes sociales (Fase 2) ----------
create table public.social_posts (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  network     text not null check (network in ('facebook','instagram','tiktok')),
  status      text not null default 'pendiente' check (status in ('pendiente','publicado','error')),
  external_id text,
  permalink   text,
  error       text,
  created_at  timestamptz not null default now()
);

create table public.comments (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          uuid references public.listings(id) on delete cascade,
  social_post_id      uuid references public.social_posts(id) on delete set null,
  network             text not null,
  external_comment_id text unique,
  author_name         text,
  message             text not null,
  reply               text,
  replied_at          timestamptz,
  notified_at         timestamptz,
  created_at          timestamptz not null default now()
);

-- ---------- Publicidad (Fase 3) ----------
create table public.ad_slots (
  id          uuid primary key default gen_random_uuid(),
  placement   text not null,   -- home_top, busqueda_lateral, anuncio_inferior, precios
  advertiser  text not null,
  image_url   text,
  link_url    text,
  starts_at   date not null default current_date,
  ends_at     date,
  active      boolean not null default true,
  impressions int not null default 0,
  clicks      int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- Favoritos ----------
create table public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ---------- Reportes de anuncios ----------
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  reason      text not null,
  details     text,
  status      text not null default 'abierto' check (status in ('abierto','resuelto')),
  created_at  timestamptz not null default now()
);

-- ---------- Contadores (llamables por cualquiera) ----------
create or replace function public.track_listing(p_id uuid, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_kind = 'view' then update listings set views = views + 1 where id = p_id;
  elsif p_kind = 'contact' then update listings set contacts = contacts + 1 where id = p_id;
  end if;
end $$;

-- Vencer anuncios viejos (cron diario)
create or replace function public.expire_listings() returns int
language sql security definer set search_path = public as $$
  with u as (update listings set status = 'vencido'
             where status = 'aprobado' and expires_at < now() returning 1)
  select count(*)::int from u;
$$;

-- =====================================================================
-- Seguridad (RLS)
-- =====================================================================
alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.farms        enable row level security;
alter table public.listings     enable row level security;
alter table public.prices       enable row level security;
alter table public.social_posts enable row level security;
alter table public.comments     enable row level security;
alter table public.ad_slots     enable row level security;
alter table public.reports      enable row level security;
alter table public.favorites    enable row level security;

-- Perfiles: cada uno ve/edita el suyo; admin todo. El rol no se cambia desde el cliente.
create policy "perfil propio" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "editar perfil propio" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "admin edita perfiles" on public.profiles for update using (public.is_admin());

-- Categorías: lectura pública, escritura admin
create policy "categorias publicas" on public.categories for select using (true);
create policy "admin categorias" on public.categories for all using (public.is_admin()) with check (public.is_admin());

-- Fincas: lectura pública; dueño crea/edita las suyas; admin todo
create policy "fincas publicas" on public.farms for select using (true);
create policy "crear finca propia" on public.farms for insert with check (owner_id = auth.uid() and verified = false);
create policy "editar finca propia" on public.farms for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and verified = (select f.verified from public.farms f where f.id = farms.id));
create policy "admin fincas" on public.farms for all using (public.is_admin()) with check (public.is_admin());

-- Anuncios: público ve aprobados; dueño ve/edita los suyos (vuelven a revisión); admin todo
create policy "anuncios aprobados publicos" on public.listings for select
  using (status = 'aprobado' or owner_id = auth.uid() or public.is_admin());
create policy "crear anuncio propio" on public.listings for insert
  with check (owner_id = auth.uid() and status = 'pendiente' and featured = false
              and exists (select 1 from public.farms f where f.id = farm_id and f.owner_id = auth.uid()));
create policy "editar anuncio propio" on public.listings for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and status in ('pendiente','vendido') and featured = false);
create policy "borrar anuncio propio" on public.listings for delete using (owner_id = auth.uid());
create policy "admin anuncios" on public.listings for all using (public.is_admin()) with check (public.is_admin());

-- Precios: lectura pública de aprobados; productores reportan (pendientes); admin todo
create policy "precios publicos" on public.prices for select using (approved or public.is_admin());
create policy "reportar precio" on public.prices for insert
  with check (auth.uid() is not null and created_by = auth.uid() and approved = false and is_reference = false);
create policy "admin precios" on public.prices for all using (public.is_admin()) with check (public.is_admin());

-- Redes y comentarios: el dueño del anuncio ve y responde; admin todo
create policy "posts del dueño" on public.social_posts for select
  using (public.is_admin() or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));
create policy "admin posts" on public.social_posts for all using (public.is_admin()) with check (public.is_admin());
create policy "comentarios del dueño" on public.comments for select
  using (public.is_admin() or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));
create policy "responder comentario" on public.comments for update
  using (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));
create policy "admin comentarios" on public.comments for all using (public.is_admin()) with check (public.is_admin());

-- Publicidad: público ve activas; admin todo
create policy "publicidad activa" on public.ad_slots for select using (active or public.is_admin());
create policy "admin publicidad" on public.ad_slots for all using (public.is_admin()) with check (public.is_admin());

-- Favoritos: cada usuario los suyos
create policy "favoritos propios" on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Reportes: cualquiera reporta; admin gestiona
create policy "crear reporte" on public.reports for insert with check (true);
create policy "admin reportes" on public.reports for all using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- Storage: bucket público "fotos"; cada usuario sube en su carpeta <uid>/...
-- =====================================================================
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true) on conflict do nothing;
create policy "fotos publicas" on storage.objects for select using (bucket_id = 'fotos');
create policy "subir fotos propias" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "borrar fotos propias" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- Categorías iniciales
-- =====================================================================
insert into public.categories (slug, name, parent_slug, sort) values
  ('ganaderia','Ganadería',null,1),
    ('novillos','Novillos','ganaderia',1),
    ('vacas','Vacas','ganaderia',2),
    ('toros','Toros','ganaderia',3),
    ('terneros','Terneros','ganaderia',4),
    ('equinos','Caballos y equinos','ganaderia',5),
  ('porcicultura','Porcicultura',null,2),
    ('lechones','Lechones','porcicultura',1),
    ('cerdas-madres','Cerdas madres','porcicultura',2),
    ('padrotes','Padrotes','porcicultura',3),
    ('cerdos-engorde','Cerdos de engorde','porcicultura',4),
  ('avicultura','Avicultura',null,3),
    ('pollos','Pollos de engorde','avicultura',1),
    ('gallinas','Gallinas ponedoras','avicultura',2),
    ('otras-aves','Patos, pavos y otras aves','avicultura',3),
  ('ovinocultura','Ovinocultura y caprinos',null,4),
    ('ovejas','Ovejas','ovinocultura',1),
    ('cabras','Cabras','ovinocultura',2),
  ('agricultura','Agricultura',null,5),
    ('name','Ñame','agricultura',1),
    ('yuca','Yuca','agricultura',2),
    ('otoe','Otoe','agricultura',3),
    ('granos','Arroz, maíz y frijol','agricultura',4),
    ('frutas','Frutas','agricultura',5),
    ('hortalizas','Hortalizas','agricultura',6),
  ('insumos','Insumos',null,6),
    ('alimento-animal','Alimento animal','insumos',1),
    ('fertilizantes','Fertilizantes y agroquímicos','insumos',2),
    ('semillas','Semillas y plantones','insumos',3),
    ('veterinarios','Productos veterinarios','insumos',4),
  ('maquinaria','Maquinaria y equipos',null,7),
    ('tractores','Tractores','maquinaria',1),
    ('implementos','Implementos','maquinaria',2),
    ('equipos','Equipos y herramientas','maquinaria',3),
  ('servicios','Servicios',null,8),
    ('servicio-veterinario','Veterinaria','servicios',1),
    ('transporte','Transporte de ganado y carga','servicios',2),
    ('mano-de-obra','Mano de obra','servicios',3),
    ('asesoria','Asesoría técnica','servicios',4),
  ('fincas-propiedades','Fincas y propiedades',null,9),
    ('venta-fincas','Fincas en venta','fincas-propiedades',1),
    ('alquiler-fincas','Fincas en alquiler','fincas-propiedades',2);

-- Para hacerte admin después de registrarte:
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'TU_CORREO');

-- Un post por red y anuncio (usado por publish-social)
alter table public.social_posts add constraint social_posts_listing_network unique (listing_id, network);
