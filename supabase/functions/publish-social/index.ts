// Supabase Edge Function: publica un anuncio aprobado en la página de Facebook y el Instagram de la plataforma.
// Solo la puede llamar un usuario con rol admin (se valida su sesión).
// Secrets: META_PAGE_ID, META_PAGE_TOKEN, META_IG_USER_ID, SITE_URL (opcional INDEXNOW_KEY)
import { createClient } from 'npm:@supabase/supabase-js@2'

const GRAPH = 'https://graph.facebook.com/v23.0'
const env = (k: string) => Deno.env.get(k) ?? ''
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, status = 200) => Response.json(b, { status, headers: cors })
const money = (n: number | null) => (n == null ? 'Consultar' : `B/. ${Number(n).toFixed(2)}`)

// Instagram no permite enlaces clicables en el texto: cambiamos la URL por "enlace en la bio"
const igText = (t: string) => t.replace(/https?:\/\/(www\.)?fincayapanama\.com\S*/g, 'fincayapanama.com 🔗 (enlace en nuestra bio)')

async function graph(path: string, params: Record<string, string>) {
  const body = new URLSearchParams({ ...params, access_token: env('META_PAGE_TOKEN') })
  const r = await fetch(`${GRAPH}/${path}`, { method: 'POST', body })
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

    const body = await req.json()

    // ---------- Publicación de marca (bienvenida, convocatorias, consejos) ----------
    if (body.brand) {
      const { message, image_url, networks = ['facebook', 'instagram'] } = body.brand
      if (!message) return json({ ok: false, error: 'falta el texto' }, 400)
      const results: Record<string, string> = {}
      if (networks.includes('facebook')) {
        try {
          const fb = image_url
            ? await graph(`${env('META_PAGE_ID')}/photos`, { url: image_url, caption: message })
            : await graph(`${env('META_PAGE_ID')}/feed`, { message, link: env('SITE_URL') })
          results.facebook = `publicado https://facebook.com/${fb.post_id || fb.id}`
        } catch (e) { results.facebook = `error: ${String(e)}` }
      }
      if (networks.includes('instagram')) {
        if (!image_url) results.instagram = 'error: Instagram requiere una imagen'
        else {
          try {
            const c = await graph(`${env('META_IG_USER_ID')}/media`, { image_url, caption: igText(message) })
            for (let i = 0; i < 10; i++) {
              const s = await (await fetch(`${GRAPH}/${c.id}?fields=status_code&access_token=${env('META_PAGE_TOKEN')}`)).json()
              if (s.status_code === 'FINISHED') break
              if (s.status_code === 'ERROR') throw new Error('Instagram no pudo procesar la imagen (usa JPG)')
              await new Promise((r) => setTimeout(r, 1500))
            }
            const pub = await graph(`${env('META_IG_USER_ID')}/media_publish`, { creation_id: c.id })
            const pl = await (await fetch(`${GRAPH}/${pub.id}?fields=permalink&access_token=${env('META_PAGE_TOKEN')}`)).json()
            results.instagram = `publicado ${pl.permalink || ''}`.trim()
          } catch (e) { results.instagram = `error: ${String(e)}` }
        }
      }
      await db.from('brand_posts').insert({ message, image_url, networks, results, created_by: auth.user.id })
      return json({ ok: true, results })
    }

    // ---------- Publicación de un anuncio aprobado ----------
    const { listing_id } = body
    const { data: l, error } = await db.from('listings').select('*, farm:farms(*), category:categories(name)').eq('id', listing_id).single()
    if (error || !l || l.status !== 'aprobado') return json({ ok: false, error: 'anuncio no aprobado' }, 400)

    const url = `${env('SITE_URL')}/anuncio/${l.slug}`
    const ig = l.farm?.instagram ? ` @${l.farm.instagram}` : ''
    const tag = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]/g, '')
    const caption = [
      `🌾 ${l.title}`,
      `💲 ${money(l.price)} por ${l.unit}${l.quantity ? ` · ${l.quantity} disponibles` : ''}`,
      `📍 ${[l.district, l.province].filter(Boolean).join(', ')}`,
      `🏡 ${l.farm?.name}${ig}`,
      l.description ? `\n${String(l.description).slice(0, 600)}` : '',
      `\n📲 Contacta directo al productor: ${url}`,
      `\n#FincaYaPanamá #AgroPanamá #ProductoresPanameños #${tag(l.province)} #${tag(l.category?.name)}`,
    ].join('\n')
    // Imagen con el marco de FincaYa (solo se acepta si viene de nuestro Storage)
    const framed = typeof body.image_url === 'string' && body.image_url.startsWith(env('SUPABASE_URL')) ? body.image_url : null
    const image = framed || l.images?.[0]
    const results: Record<string, unknown> = {}

    // Candado: cada anuncio se publica UNA sola vez por red, aunque se pulse varias veces
    const claim = async (network: string) => {
      const ins = await db.from('social_posts').upsert({ listing_id, network, status: 'publicando' }, { onConflict: 'listing_id,network', ignoreDuplicates: true }).select('id')
      if (ins.data?.length) return true
      const upd = await db.from('social_posts').update({ status: 'publicando', error: null }).eq('listing_id', listing_id).eq('network', network).in('status', ['pendiente', 'error']).select('id')
      return !!upd.data?.length
    }

    // Facebook (página)
    if (!(await claim('facebook'))) results.facebook = 'ya publicado o en proceso'
    else try {
      const fb = image
        ? await graph(`${env('META_PAGE_ID')}/photos`, { url: image, caption })
        : await graph(`${env('META_PAGE_ID')}/feed`, { message: caption, link: url })
      const id = fb.post_id || fb.id
      await db.from('social_posts').upsert({ listing_id, network: 'facebook', status: 'publicado', external_id: id, permalink: `https://facebook.com/${id}`, error: null }, { onConflict: 'listing_id,network' })
      results.facebook = 'publicado'
    } catch (e) {
      await db.from('social_posts').upsert({ listing_id, network: 'facebook', status: 'error', error: String(e) }, { onConflict: 'listing_id,network' })
      results.facebook = String(e)
    }

    // Instagram (requiere imagen JPG pública)
    if (image && env('META_IG_USER_ID') && !(await claim('instagram'))) {
      results.instagram = 'ya publicado o en proceso'
    } else if (image && env('META_IG_USER_ID')) {
      try {
        const container = await graph(`${env('META_IG_USER_ID')}/media`, { image_url: image, caption: igText(caption) })
        // Esperar a que Instagram procese la imagen
        for (let i = 0; i < 10; i++) {
          const s = await (await fetch(`${GRAPH}/${container.id}?fields=status_code&access_token=${env('META_PAGE_TOKEN')}`)).json()
          if (s.status_code === 'FINISHED') break
          if (s.status_code === 'ERROR') throw new Error('Instagram no pudo procesar la imagen')
          await new Promise((r) => setTimeout(r, 1500))
        }
        const pub = await graph(`${env('META_IG_USER_ID')}/media_publish`, { creation_id: container.id })
        const pl = await (await fetch(`${GRAPH}/${pub.id}?fields=permalink&access_token=${env('META_PAGE_TOKEN')}`)).json()
        await db.from('social_posts').upsert({ listing_id, network: 'instagram', status: 'publicado', external_id: pub.id, permalink: pl.permalink || null, error: null }, { onConflict: 'listing_id,network' })
        results.instagram = 'publicado'
      } catch (e) {
        await db.from('social_posts').upsert({ listing_id, network: 'instagram', status: 'error', error: String(e) }, { onConflict: 'listing_id,network' })
        results.instagram = String(e)
      }
    } else {
      results.instagram = 'sin foto: Instagram requiere imagen'
    }

    if (env('INDEXNOW_KEY')) fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${env('INDEXNOW_KEY')}`).catch(() => {})
    return json({ ok: true, results })
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500)
  }
})
