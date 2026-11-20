// Supabase Edge Function: avisos de FincaYa (centro de notificaciones + push al celular).
// - GET  ?vapid=1                         → clave pública para suscribirse (se crea sola la primera vez)
// - POST { event, listing_id|comment_id } → lo llaman los disparadores de la base de datos
// - POST { event: 'test' } con sesión     → aviso de prueba al propio usuario
// Cada evento se valida contra la base de datos y se registra para no repetirse.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const env = (k: string) => Deno.env.get(k) ?? ''
const SITE = env('SITE_URL') || 'https://fincayapanama.com'
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (b: unknown, status = 200) => Response.json(b, { status, headers: cors })

async function vapid() {
  const { data } = await db.from('app_secrets').select('value').eq('key', 'vapid').maybeSingle()
  if (data?.value?.publicKey) return data.value
  const k = webpush.generateVAPIDKeys()
  await db.from('app_secrets').upsert({ key: 'vapid', value: k })
  return k
}

// Registra la clave del evento; si ya existía, devuelve false (evento repetido)
async function once(key: string) {
  const { error } = await db.from('notify_log').insert({ key })
  return !error
}

type Msg = { kind: string; title: string; body: string; url: string }

async function deliver(userIds: string[], m: Msg) {
  if (!userIds.length) return { users: 0, pushes: 0 }
  await db.from('notifications').insert(userIds.map((user_id) => ({ user_id, ...m })))
  const { data: subs } = await db.from('push_subscriptions').select('*').in('user_id', userIds)
  if (!subs?.length) return { users: userIds.length, pushes: 0 }
  const k = await vapid()
  webpush.setVapidDetails('mailto:hola@fincayapanama.com', k.publicKey, k.privateKey)
  let ok = 0
  const payload = JSON.stringify({ title: m.title, body: m.body, url: m.url, tag: m.kind })
  await Promise.all(subs.map(async (s) => {
    try {
      const req = webpush.generateRequestDetails({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 })
      const r = await fetch(req.endpoint, { method: 'POST', headers: req.headers as Record<string, string>, body: req.body })
      if (r.status === 404 || r.status === 410) await db.from('push_subscriptions').delete().eq('id', s.id)
      else if (r.ok) ok++
    } catch (_) { /* un dispositivo caído no detiene a los demás */ }
  }))
  return { users: userIds.length, pushes: ok }
}

const admins = async () => ((await db.from('profiles').select('id').eq('role', 'admin')).data || []).map((p) => p.id)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = new URL(req.url)
    if (req.method === 'GET' && url.searchParams.get('vapid')) return json({ publicKey: (await vapid()).publicKey })
    const body = await req.json().catch(() => ({}))

    // Aviso de prueba para el usuario con sesión
    if (body.event === 'test') {
      const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
      const { data: auth } = await db.auth.getUser(jwt)
      if (!auth?.user) return json({ ok: false, error: 'sin sesión' }, 401)
      return json({ ok: true, ...(await deliver([auth.user.id], { kind: 'test', title: '🔔 Notificaciones activadas', body: 'Así te avisaremos de clientes, comentarios y anuncios.', url: `${SITE}/panel` })) })
    }

    if (body.event === 'listing_created' || body.event === 'listing_status') {
      const { data: l }: { data: any } = await db.from('listings').select('id,title,slug,status,owner_id,reject_reason,farm:farms(name)').eq('id', body.listing_id).maybeSingle()
      if (!l) return json({ ok: false, error: 'no existe' }, 404)
      if (body.event === 'listing_created') {
        if (l.status !== 'pendiente' || !(await once(`created:${l.id}:${new Date().toISOString().slice(0, 13)}`))) return json({ ok: true, skipped: true })
        return json({ ok: true, ...(await deliver(await admins(), { kind: 'admin_pending', title: '🆕 Anuncio por aprobar', body: `${l.title} — ${l.farm?.name || ''}`.trim(), url: `${SITE}/admin/anuncios` })) })
      }
      if (!['aprobado', 'rechazado'].includes(l.status) || !(await once(`status:${l.id}:${l.status}`))) return json({ ok: true, skipped: true })
      const m: Msg = l.status === 'aprobado'
        ? { kind: 'listing_approved', title: '✅ Tu anuncio fue publicado', body: `"${l.title}" ya está visible en FincaYa Panamá.`, url: `${SITE}/anuncio/${l.slug}` }
        : { kind: 'listing_rejected', title: '⚠️ Tu anuncio necesita cambios', body: l.reject_reason ? `Motivo: ${l.reject_reason}` : `Revisa "${l.title}" en tu panel.`, url: `${SITE}/panel` }
      return json({ ok: true, ...(await deliver([l.owner_id], m)) })
    }

    if (body.event === 'comment') {
      const { data: c }: { data: any } = await db.from('comments').select('id,network,author_name,message,listing:listings(owner_id,title)').eq('id', body.comment_id).maybeSingle()
      if (!c?.listing || !(await once(`comment:${c.id}`))) return json({ ok: true, skipped: true })
      const red = c.network === 'instagram' ? 'Instagram' : 'Facebook'
      return json({ ok: true, ...(await deliver([c.listing.owner_id], { kind: 'comment', title: `💬 Comentario en ${red}`, body: `${c.author_name || 'Alguien'}: ${String(c.message).slice(0, 120)}`, url: `${SITE}/panel/comentarios` })) })
    }
    return json({ ok: false, error: 'evento desconocido' }, 400)
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500)
  }
})
