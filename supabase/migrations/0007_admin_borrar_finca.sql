-- Permite al admin borrar una finca con todo lo suyo (anuncios, comentarios, favoritos, reportes, publicaciones)
create or replace function public.admin_delete_farm(p_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Solo un admin puede borrar fincas'; end if;
  delete from public.farms where id = p_id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.admin_delete_farm(uuid) from public, anon;
grant execute on function public.admin_delete_farm(uuid) to authenticated;
