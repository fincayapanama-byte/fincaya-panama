// Supabase Edge Function: sincroniza los precios oficiales del IMA (sipan.ima.gob.pa) en la tabla prices.
// La llama el cron diario (sin sesión: solo hoy y ayer, máx. 1 vez cada 20 min)
// o un admin desde el panel (puede pedir hasta 60 días hacia atrás).
import { createClient } from 'npm:@supabase/supabase-js@2'

const SIPAN = 'https://sipan.ima.gob.pa'
const env = (k: string) => Deno.env.get(k) ?? ''
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (b: unknown, status = 200) => Response.json(b, { status, headers: cors })

// Mercados nacionales de SIPAN → provincia
const MARKETS: Record<number, string | null> = {
  1: 'Panamá', 2: 'Panamá', 4: 'Panamá', 12: 'Veraguas', 14: 'Herrera', 15: 'Los Santos', 16: 'Chiriquí',
  17: 'Coclé', 18: 'Darién', 19: 'Panamá', 20: 'Veraguas', 21: null, 99: null, 100: 'Los Santos', 101: 'Colón',
}
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const ymd = (d: Date) => d.toISOString().slice(0, 10)
const panamaToday = () => new Date(Date.now() - 5 * 3600e3) // UTC-5

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    let isAdmin = false
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    if (jwt) {
      const { data: auth } = await db.auth.getUser(jwt)
      if (auth?.user) {
        const { data: prof } = await db.from('profiles').select('role').eq('id', auth.user.id).single()
        isAdmin = prof?.role === 'admin'
      }
    }
    if (!isAdmin) {
      const { data: last } = await db.from('price_sync_log').select('ran_at').order('ran_at', { ascending: false }).limit(1)
      if (last?.[0] && Date.now() - new Date(last[0].ran_at).getTime() < 20 * 60e3) return json({ ok: true, skipped: 'sincronizado hace menos de 20 min' })
    }
    const days = isAdmin ? Math.min(Math.max(Number(body.days) || 2, 1), 60) : 2
    const end = panamaToday()
    const start = new Date(end.getTime() - (days - 1) * 864e5)
    const detail: Record<string, unknown> = {}
    let total = 0

    for (const [id, province] of Object.entries(MARKETS)) {
      try {
        const r = await fetch(`${SIPAN}/charts/PrecioTendencia`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'FincaYaPanama/1.0 (+https://fincayapanama.com)' },
          body: new URLSearchParams({ MercadoId: id, fechaInicio: ymd(start), fechaFin: ymd(end) }),
        })
        if (!r.ok) { detail[id] = `HTTP ${r.status}`; continue }
        const data = await r.json()
        const rows = (Array.isArray(data) ? data : [])
          .filter((x) => !x.precioSinData && Number(x.precioPromedio) > 0)
          .map((x) => {
            const name = String(x.producto?.productoNombre || '').replace(/\s+/g, ' ').trim()
            return {
              external_id: `ima-${x.precioId}`,
              product_slug: slug(name),
              product_name: name,
              category_slug: Number(id) === 99 ? 'ganaderia' : [4, 100].includes(Number(id)) ? null : 'agricultura',
              unit: String(x.unidadMedida?.unidadMedidaNombre || 'unidad').toLowerCase(),
              market: x.mercado?.mercadoNombre || null,
              province,
              origin: x.origen?.origenNombre || null,
              price: Number(x.precioPromedio),
              price_min: x.precioMinimo != null ? Number(x.precioMinimo) : null,
              price_max: x.precioMaximo != null ? Number(x.precioMaximo) : null,
              source: 'IMA',
              source_url: SIPAN,
              is_reference: false,
              approved: true,
              date: String(x.precioFecha).slice(0, 10),
            }
          })
        for (let i = 0; i < rows.length; i += 500) {
          const { error } = await db.from('prices').upsert(rows.slice(i, i + 500), { onConflict: 'external_id' })
          if (error) throw error
        }
        detail[id] = rows.length
        total += rows.length
      } catch (e) { detail[id] = `error: ${String(e)}` }
    }
    await db.from('price_sync_log').insert({ days, upserted: total, detail })
    return json({ ok: true, days, upserted: total, detail })
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500)
  }
})
