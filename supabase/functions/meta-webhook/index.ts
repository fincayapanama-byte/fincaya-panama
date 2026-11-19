// Supabase Edge Function: webhook de Meta para comentarios de Facebook e Instagram.
// 1) Guarda el comentario ligado al anuncio. 2) Avisa al productor por WhatsApp (plantilla).
// Configurar en developers.facebook.com → Webhooks: objeto "page" campo "feed" e "instagram" campo "comments".
// Secrets: META_VERIFY_TOKEN, META_APP_SECRET, WA_TOKEN, WA_PHONE_ID, WA_TEMPLATE (ej. nuevo_comentario), SITE_URL
// Desplegar con: supabase functions deploy meta-webhook --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2'

const env = (k: string) => Deno.env.get(k) ?? ''
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))

async function validSignature(req: Request, raw: string) {
  const sig = req.headers.get('x-hub-signature-256')?.replace('sha256=', '')
  if (!sig || !env('META_APP_SECRET')) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env('META_APP_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw))
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex === sig
}

async function notifyWhatsApp(to: string, author: string, message: string, title: string, url: string) {
  if (!env('WA_TOKEN') || !to) return
  await fetch(`https://graph.facebook.com/v23.0/${env('WA_PHONE_ID')}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('WA_TOKEN')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to, type: 'template',
      template: { name: env('WA_TEMPLATE') || 'nuevo_comentario', language: { code: 'es' },
        components: [{ type: 'body', parameters: [author, title, message.slice(0, 300), url].map((text) => ({ type: 'text', text })) }] },
    }),
  })
}

Deno.serve(async (req) => {
  const u = new URL(req.url)
  if (req.method === 'GET') {
    // Verificación del webhook
    return u.searchParams.get('hub.verify_token') === env('META_VERIFY_TOKEN')
      ? new Response(u.searchParams.get('hub.challenge') ?? '') : new Response('forbidden', { status: 403 })
  }
  const raw = await req.text()
  if (!(await validSignature(req, raw))) return new Response('bad signature', { status: 401 })
  const body = JSON.parse(raw)

  for (const entry of body.entry ?? []) {
    for (const ch of entry.changes ?? []) {
      const v = ch.value ?? {}
      const isFb = body.object === 'page' && v.item === 'comment' && v.verb === 'add'
      const isIg = body.object === 'instagram' && ch.field === 'comments'
      if (!isFb && !isIg) continue
      const network = isFb ? 'facebook' : 'instagram'
      const postId = isFb ? v.post_id : v.media?.id
      const { data: post } = await db.from('social_posts').select('id, listing_id').eq('external_id', postId).maybeSingle()
      if (!post) continue
      const comment = {
        listing_id: post.listing_id, social_post_id: post.id, network,
        external_comment_id: isFb ? v.comment_id : v.id,
        author_name: isFb ? v.from?.name : v.from?.username,
        message: isFb ? v.message : v.text,
      }
      const { data: saved } = await db.from('comments').upsert(comment, { onConflict: 'external_comment_id' }).select().single()
      const { data: l } = await db.from('listings').select('title, slug, farm:farms(whatsapp)').eq('id', post.listing_id).single()
      await notifyWhatsApp(l?.farm?.whatsapp, comment.author_name ?? 'Alguien', comment.message ?? '', l?.title ?? '', `${env('SITE_URL')}/panel/comentarios`)
      if (saved) await db.from('comments').update({ notified_at: new Date().toISOString() }).eq('id', saved.id)
    }
  }
  return new Response('ok')
})
