// Supabase Edge Function: trae de Facebook e Instagram los comentarios de los anuncios publicados
// y los guarda en la tabla comments. Se usa a demanda desde el panel admin (Comentarios → Buscar comentarios nuevos).
// Sirve de respaldo del webhook (meta-webhook) y recupera comentarios que no llegaron.
// Solo la puede llamar un usuario con rol admin.
// Secrets: META_PAGE_ID, META_PAGE_TOKEN, META_IG_USER_ID
import { createClient } from 'npm:@supabase/supabase-js@2'

const GRAPH = 'https://graph.facebook.com/v23.0'
const env = (k: string) => Deno.env.get(k) ?? ''
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, status = 200) => Response.json(b, { status, headers: cors })

// Igual que publish-social: acepta token de página o de usuario del sistema
let pageToken = ''
async function token() {
  if (pageToken) return pageToken
  const t = env('META_PAGE_TOKEN')
  try {
    const r = await (await fetch(`${GRAPH}/${env('META_PAGE_ID')}?fields=access_token&access_token=${t}`)).json()
    pageToken = r.access_token || t
  } catch { pageToken = t }
  return pageToken
}

async function get(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, access_token: await token() })
  const r = await fetch(`${GRAPH}/${path}?${qs}`)
  const j = await r.json()
  if (!r.ok || j.error) throw new Error(j.error?.message || `Graph ${r.status}`)
  return j
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    // Solo admins
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: auth } = await db.auth.getUser(jwt)
    if (!auth?.user) return json({ ok: false, error: 'sin sesión' }, 401)
    const { data: prof } = await db.from('profiles').select('role').eq('id', auth.user.id).single()
    if (prof?.role !== 'admin') return json({ ok: false, error: 'solo admin' }, 403)

    const body = await req.json().catch(() => ({}))
    const days = Math.min(Math.max(Number(body.days) || 30, 1), 90)
    const since = new Date(Date.now() - days * 864e5).toISOString()

    const { data: posts } = await db.from('social_posts')
      .select('id, listing_id, network, external_id, created_at')
      .eq('status', 'publicado').gte('created_at', since)
    const list = (posts ?? []).filter((p: { external_id: string | null }) => p.external_id)

    // Para no guardar nuestras propias respuestas como si fueran de compradores
    let igUser = ''
    try { igUser = (await get(env('META_IG_USER_ID'), { fields: 'username' })).username ?? '' } catch { /* sigue */ }

    const errors: string[] = []
    let checked = 0
    const found: Record<string, unknown>[] = []
    for (const p of list) {
      try {
        if (p.network === 'instagram') {
          const r = await get(`${p.external_id}/comments`, { fields: 'id,text,username,timestamp', limit: '100' })
          for (const c of r.data ?? []) {
            if (igUser && c.username === igUser) continue
            found.push({ listing_id: p.listing_id, social_post_id: p.id, network: 'instagram', external_comment_id: c.id, author_name: c.username ?? null, message: c.text ?? '', created_at: c.timestamp })
          }
        } else if (p.network === 'facebook') {
          const r = await get(`${p.external_id}/comments`, { fields: 'id,message,from,created_time', limit: '100' })
          for (const c of r.data ?? []) {
            if (c.from?.id && c.from.id === env('META_PAGE_ID')) continue
            found.push({ listing_id: p.listing_id, social_post_id: p.id, network: 'facebook', external_comment_id: c.id, author_name: c.from?.name ?? 'Usuario de Facebook', message: c.message ?? '', created_at: c.created_time })
          }
        }
        checked++
      } catch (e) {
        errors.push(`${p.network} ${p.external_id}: ${(e as Error).message}`)
      }
    }

    // Solo guardamos los que faltan (el trigger avisa al dueño de los recientes)
    let added = 0
    if (found.length) {
      const ids = found.map((c) => c.external_comment_id as string)
      const { data: have } = await db.from('comments').select('external_comment_id').in('external_comment_id', ids)
      const known = new Set((have ?? []).map((r: { external_comment_id: string }) => r.external_comment_id))
      const fresh = found.filter((c) => c.message && !known.has(c.external_comment_id as string))
      const old = Date.now() - 2 * 864e5
      const rows = fresh.map((c) => (new Date(c.created_at as string).getTime() < old ? { ...c, notified_at: new Date().toISOString() } : c))
      if (rows.length) {
        const { data: saved, error } = await db.from('comments').upsert(rows, { onConflict: 'external_comment_id', ignoreDuplicates: true }).select('id')
        if (error) errors.push(`guardar: ${error.message}`)
        added = saved?.length ?? 0
      }
    }
    return json({ ok: true, posts: list.length, checked, found: found.length, added, errors })
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500)
  }
})
