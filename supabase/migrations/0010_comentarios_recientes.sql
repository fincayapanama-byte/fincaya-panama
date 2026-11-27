-- Comentarios recuperados a demanda (función sync-comments): solo avisamos al dueño de los recientes.
-- Los comentarios de más de 2 días se guardan sin disparar notificación.
create or replace function public.notify_comment_event() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.created_at < now() - interval '2 days' then
    return new;
  end if;
  perform net.http_post(
    url := 'https://grxnghtgkrlgndwefptw.supabase.co/functions/v1/notify',
    body := jsonb_build_object('event', 'comment', 'comment_id', new.id),
    headers := '{"Content-Type":"application/json"}'::jsonb);
  return new;
end $$;
