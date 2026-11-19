-- Evita publicaciones duplicadas: estado intermedio 'publicando'
alter table public.social_posts drop constraint if exists social_posts_status_check;
alter table public.social_posts add constraint social_posts_status_check
  check (status in ('pendiente','publicando','publicado','error'));
