// Sitemap dinámico: solo URLs públicas, indexables y con contenido real.
// Portada, páginas fijas, categorías y categoría×provincia con anuncios, fincas, precios y anuncios aprobados.
import { q, SITE, slugify, PROV_BY_SLUG } from './_db.js'

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const day = (d) => (d ? String(d).slice(0, 10) : undefined)
const newest = (a, b) => (!a ? b : !b ? a : a >= b ? a : b)

export default async function handler(req, res) {
  const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
  const [listings, farms, cats, prices] = await Promise.all([
    q('listings?status=eq.aprobado&select=slug,category_slug,province,approved_at,created_at&order=created_at.desc&limit=5000'),
    q('farms?select=slug,created_at&limit=5000'),
    q('categories?select=slug,parent_slug'),
    q(`prices?approved=eq.true&date=gte.${since}&select=product_slug,date&order=date.desc&limit=20000`),
  ])
  const parentOf = Object.fromEntries(cats.map((c) => [c.slug, c.parent_slug]))
  const lastBySlug = {}
  for (const p of prices) if (!lastBySlug[p.product_slug]) lastBySlug[p.product_slug] = p.date

  // lastmod real: fecha del anuncio más reciente que afecta a cada página
  const catMod = {}; const comboMod = {}; let listingsMod
  for (const l of listings) {
    const d = day(l.approved_at || l.created_at)
    listingsMod = newest(listingsMod, d)
    const ps = slugify(l.province)
    // un anuncio cuenta para su categoría y para la categoría principal (la app y la página para bots las agrupan)
    for (const c of new Set([l.category_slug, parentOf[l.category_slug]].filter(Boolean))) {
      catMod[c] = newest(catMod[c], d)
      if (PROV_BY_SLUG[ps]) comboMod[`${c}/${ps}`] = newest(comboMod[`${c}/${ps}`], d)
    }
  }
  const farmsMod = farms.map((f) => day(f.created_at)).reduce(newest, undefined)

  const urls = [
    { loc: `${SITE}/`, lastmod: newest(listingsMod, day(prices[0]?.date)) },
    { loc: `${SITE}/precios`, lastmod: day(prices[0]?.date) },
    { loc: `${SITE}/fincas`, lastmod: farmsMod },
    { loc: `${SITE}/mapa`, lastmod: farmsMod },
    { loc: `${SITE}/seguridad` },
    { loc: `${SITE}/acerca` },
    { loc: `${SITE}/preguntas-frecuentes` },
    ...Object.entries(catMod).map(([c, d]) => ({ loc: `${SITE}/c/${c}`, lastmod: d })),
    ...Object.entries(comboMod).map(([k, d]) => ({ loc: `${SITE}/c/${k}`, lastmod: d })),
    ...Object.entries(lastBySlug).map(([slug, date]) => ({ loc: `${SITE}/precios/${slug}`, lastmod: day(date) })),
    // Sin lastmod: la tabla de fincas no guarda fecha de modificación y created_at no lo es
    ...farms.map((f) => ({ loc: `${SITE}/finca/${f.slug}` })),
    ...listings.map((l) => ({ loc: `${SITE}/anuncio/${l.slug}`, lastmod: day(l.approved_at || l.created_at) })),
  ]
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) =>
    `  <url><loc>${xml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>`
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(body)
}
