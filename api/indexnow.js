// Aviso diario a IndexNow (Bing, Copilot/ChatGPT, Yandex, Seznam) SOLO con lo que cambió en las últimas 25 h:
// anuncios aprobados o vencidos, fincas nuevas y las categorías que los contienen, más la portada y /precios.
// La clave es pública por diseño: está publicada en /88efb5c80c3815d1b69646a9c0701680.txt
import { q, SITE, slugify, PROV_BY_SLUG } from './_db.js'
const KEY = '88efb5c80c3815d1b69646a9c0701680'

async function submit(urls) {
  const body = JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls })
  let last
  for (let i = 0; i < 2; i++) {
    try {
      last = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body })
      if (last.status < 500 && last.status !== 429) return last // 200/202 = aceptado; 4xx = error nuestro, no se reintenta
    } catch { last = null }
    await new Promise((r) => setTimeout(r, 2000))
  }
  return last
}

export default async function handler(req, res) {
  // Vercel envía "Authorization: Bearer <CRON_SECRET>" en los cron si la variable existe.
  // Si no está definida, el endpoint sigue funcionando (solo envía URLs que cambiaron, así que el abuso es de bajo costo).
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) { res.status(401).json({ ok: false, error: 'unauthorized' }); return }

  const since = encodeURIComponent(new Date(Date.now() - 25 * 3600e3).toISOString())
  const [fresh, gone, newFarms, cats] = await Promise.all([
    q(`listings?status=eq.aprobado&approved_at=gte.${since}&select=slug,category_slug,province&limit=2000`),
    q(`listings?status=eq.vencido&expires_at=gte.${since}&select=slug,category_slug,province&limit=2000`),
    q(`farms?created_at=gte.${since}&select=slug&limit=2000`),
    q('categories?select=slug,parent_slug'),
  ])
  const parentOf = Object.fromEntries(cats.map((c) => [c.slug, c.parent_slug]))
  const set = new Set([`${SITE}/`, `${SITE}/precios`])
  for (const l of [...fresh, ...gone]) {
    set.add(`${SITE}/anuncio/${l.slug}`)
    const ps = slugify(l.province)
    for (const c of new Set([l.category_slug, parentOf[l.category_slug]].filter(Boolean))) {
      set.add(`${SITE}/c/${c}`)
      if (PROV_BY_SLUG[ps]) set.add(`${SITE}/c/${c}/${ps}`)
    }
  }
  for (const f of newFarms) set.add(`${SITE}/finca/${f.slug}`)
  if (newFarms.length) { set.add(`${SITE}/fincas`); set.add(`${SITE}/mapa`) }
  const urls = [...set].slice(0, 10000)

  const r = await submit(urls)
  res.status(200).json({ ok: !!r && r.status < 300, status: r ? r.status : 'sin respuesta', submitted: urls.length, listings: fresh.length, removed: gone.length, farms: newFarms.length })
}
