# Directorio agropecuario de Panamá — MVP (Fase 1)

React + Vite + Supabase + Vercel. Nombre provisional: **FincaYa Panamá** (se cambia en `src/lib/config.js`, `index.html`, `public/robots.txt` y la variable `SITE_URL`).

## Probarlo ya (modo demo, sin Supabase)

```bash
npm install
npm run dev        # abre http://localhost:5173
```

Sin variables de entorno la app corre en **modo demo**: datos de ejemplo guardados en el navegador.
En `/entrar` hay botones para entrar como **productor** o **admin** y probar todo el flujo:
publicar → revisar en admin → aprobar → cola de redes → comentarios.

## Qué incluye

| Área | Rutas |
|---|---|
| Público | `/` portada · `/buscar` · `/c/:categoria` · `/c/:categoria/:provincia` (páginas SEO) · `/anuncio/:slug` · `/finca/:slug` · `/fincas` · `/precios` · `/seguridad` |
| Productor | `/entrar` · `/publicar` (registra finca la primera vez) · `/panel` (anuncios + métricas) · `/panel/comentarios` · `/panel/finca` · `/panel/precio` |
| Admin | `/admin` resumen · anuncios (aprobar, rechazar, destacar) · usuarios (rol, bloquear) · fincas (verificar) · precios (cargar, aprobar reportes) · redes (cola de publicación) · comentarios · publicidad · reportes |
| SEO | `api/seo.js` entrega HTML completo con datos estructurados a Google, Bing, ChatGPT y WhatsApp · `api/sitemap.js` sitemap dinámico · `robots.txt` |
| Automatización (Fase 2) | `supabase/functions/publish-social` (Facebook + Instagram) · `meta-webhook` (comentarios → WhatsApp del productor) · `indexnow` (aviso a Bing) |

## Pasar a producción

### 1. Supabase
1. Crea un proyecto en supabase.com (región: us-east-1 es la más cercana).
2. **SQL Editor** → pega `supabase/migrations/0001_esquema.sql` → **Run**. Crea tablas, seguridad (RLS), bucket de fotos y categorías.
3. **Authentication → URL Configuration**: Site URL = tu dominio.
4. Regístrate en la web y hazte admin en el SQL Editor:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'fincayapanama@gmail.com');
   ```
5. Tareas diarias (**Database → Cron**, extensión `pg_cron`):
   ```sql
   select cron.schedule('vencer-anuncios', '0 6 * * *', 'select public.expire_listings()');
   select cron.schedule('precios-referencia', '0 7 * * *', 'select public.snapshot_reference_prices()');
   ```

### 2. Vercel
1. Sube este proyecto a GitHub y en Vercel → **Add New Project** (Framework: Vite).
2. Variables de entorno:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Supabase → Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` (solo para `api/`, nunca en el frontend)
   - `SITE_URL` = `https://tudominio.com`
3. Conecta el dominio, y registra el sitio en Google Search Console y Bing Webmaster con `sitemap.xml`.

### 3. Redes y WhatsApp (Fase 2, cuando Meta apruebe)
1. developers.facebook.com → crea una app tipo **Business** en el portafolio comercial.
2. Pide los permisos `pages_manage_posts`, `pages_read_engagement`, `instagram_content_publish`, `instagram_manage_comments` (requieren revisión de Meta).
3. Secrets en Supabase:
   ```bash
   supabase secrets set META_PAGE_ID=... META_PAGE_TOKEN=... META_IG_USER_ID=... \
     META_APP_SECRET=... META_VERIFY_TOKEN=... WA_TOKEN=... WA_PHONE_ID=... \
     WA_TEMPLATE=nuevo_comentario SITE_URL=https://tudominio.com INDEXNOW_KEY=...
   supabase functions deploy publish-social
   supabase functions deploy meta-webhook --no-verify-jwt
   supabase functions deploy indexnow
   ```
4. En la app de Meta → Webhooks: URL `https://<proyecto>.functions.supabase.co/meta-webhook`, objeto **page** campo `feed` e **instagram** campo `comments`.
5. Crea en WhatsApp Manager la plantilla `nuevo_comentario` (categoría Utilidad) con 4 variables: autor, anuncio, comentario, enlace.
6. TikTok: solicitar acceso a Content Posting API y pasar la auditoría; sin auditoría los posts salen privados.

Mientras Meta revisa, el admin publica desde **Admin → Redes**.

## Pendiente para próximas fases
- Responder comentarios en la red desde el panel (hoy se guarda la respuesta; falta la llamada a Graph API).
- Importación automática de precios (INEC mensual, subastas).
- Anuncios destacados pagados (Yappy / tarjeta), plan Pro, alertas a compradores.
- Contador de impresiones y clics de banners.
- Moderación con IA de fotos y textos.
