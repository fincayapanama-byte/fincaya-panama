// Supabase Edge Function: publica un anuncio aprobado en la página de Facebook y el Instagram de la plataforma.
// Secrets necesarios (supabase secrets set ...):
//   META_PAGE_ID, META_PAGE_TOKEN (token de página de larga duración), META_IG_USER_ID, SITE_URL
//   SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY vienen por defecto en Edge Functions.
import { createClient } from 'npm:@supabase/supabase-js@2'

const GRAPH = 'https://graph.facebook.com/v23.0'
const env = (k: string) => Deno.env.get(k) ?? ''
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))

const money = (n: number | null) => (n == null ? 'Consultar' : `B/. ${Number(n).toFixed(2)}`)

async function graph(path: string, params: Record<string, string>) {
  const body = new URLSearchParams({ ...params, access_token: env('META_PAGE_TOKEN') })
  const r = await fetch(`${GRAPH}/${path}`, { method: 'POST', body })
  const j = await r.json()
  if (!r.ok || j.error) throw new Error(j.error?.message || `Graph ${r.status}`)
  return j
}

Deno.serve(async (req) => {
  try {
    const { listing_id } = await req.json()
    const { data: l, error } = await db.from('listings').select('*, farm:farms(*), category:categories(name)').eq('id', listing_id).single()
    if (error || !l || l.status !== 'aprobado') return Response.json({ ok: false, reason: 'anuncio no aprobado' }, { status: 400 })

    const url = `${env('SITE_URL')}/anuncio/${l.slug}`
    const ig = l.farm?.instagram ? ` @${l.farm.instagram}` : ''
    const caption = [
      `🌾 ${l.title}`,
      `💲 ${money(l.price)} por ${l.unit}${l.quantity ? ` · ${l.quantity} disponibles` : ''}`,
      `📍 ${[l.district, l.province].filter(Boolean).join(', ')}`,
      `🏡 ${l.farm?.name}${ig}`,
      l.description ? `\n${String(l.description).slice(0, 600)}` : '',
      `\n📲 WhatsApp directo al productor: ${url}`,
      `#Panamá #${(l.province || '').replace(/\s+/g, '')} #AgroPanamá #${(l.category?.name || '').replace(/\s+/g, '')}`,
    ].join('\n')
    const image = l.images?.[0]
    const results: Record<string, unknown> = {}

    // Facebook (página)
    try {
      const fb = image
        ? await graph(`${env('META_PAGE_ID')}/photos`, { url: image, caption })
        : await graph(`${env('META_PAGE_ID')}/feed`, { message: caption, link: url })
      const id = fb.post_id || fb.id
      await db.from('social_posts').upsert({ listing_id, network: 'facebook', status: 'publicado', external_id: id, permalink: `https://facebook.com/${id}` }, { onConflict: 'listing_id,network' })
      results.facebook = id
    } catch (e) {
      await db.from('social_posts').upsert({ listing_id, network: 'facebook', status: 'error', error: String(e) }, { onConflict: 'listing_id,network' })
    }

    // Instagram (requiere imagen pública JPG)
    if (image && env('META_IG_USER_ID')) {
      try {
        const container = await graph(`${env('META_IG_USER_ID')}/media`, { image_url: image, caption })
        const pub = await graph(`${env('META_IG_USER_ID')}/media_publish`, { creation_id: container.id })
        await db.from('social_posts').upsert({ listing_id, network: 'instagram', status: 'publicado', external_id: pub.id }, { onConflict: 'listing_id,network' })
        results.instagram = pub.id
      } catch (e) {
        await db.from('social_posts').upsert({ listing_id, network: 'instagram', status: 'error', error: String(e) }, { onConflict: 'listing_id,network' })
      }
    }

    // Avisar a Bing (IndexNow) del anuncio nuevo
    if (env('INDEXNOW_KEY')) {
      fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${env('INDEXNOW_KEY')}`).catch(() => {})
    }
    return Response.json({ ok: true, results })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 })
  }
})
