-- Mapa de fincas: actividades (para el ícono) y opción de mostrarse en el mapa público
alter table public.farms add column if not exists activities text[] not null default '{}';
alter table public.farms add column if not exists show_on_map boolean not null default true;
create index if not exists farms_geo on public.farms (lat, lng) where lat is not null;
