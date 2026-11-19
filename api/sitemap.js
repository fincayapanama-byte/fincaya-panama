// Sitemap dinámico: portada, páginas fijas, categoría×provincia con anuncios, fincas y anuncios aprobados.
import { q, SITE } from './_db.js'

const slugify = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export default async function handler(req, res) {
  const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
  const [listings, farms, cats, prices] = await Promise.all([
    q('listings?status=eq.aprobado&select=slug,category_slug,province,created_at&order=created_at.desc&limit=5000'),
    q('farms?select=slug,created_at&limit=5000'),
    q('categories?select=slug'),
    q(`prices?approved=eq.true&date=gte.${since}&select=product_slug,date&order=date.desc&limit=20000`),
  ])
  const lastBySlug = {}
  for (const p of prices) if (!lastBySlug[p.product_slug]) lastBySlug[p.product_slug] = p.date
  const urls = [
    { loc: `${SITE}/`, freq: 'daily' }, { loc: `${SITE}/precios`, lastmod: prices[0]?.date, freq: 'daily' },
    { loc: `${SITE}/buscar`, freq: 'daily' }, { loc: `${SITE}/fincas`, freq: 'weekly' },
    ...cats.map((c) => ({ loc: `${SITE}/c/${c.slug}`, freq: 'daily' })),
    ...[...new Set(listings.map((l) => `${l.category_slug}/${slugify(l.province)}`))].map((k) => ({ loc: `${SITE}/c/${k}`, freq: 'daily' })),
    ...Object.entries(lastBySlug).map(([slug, date]) => ({ loc: `${SITE}/precios/${slug}`, lastmod: date, freq: 'daily' })),
    ...farms.map((f) => ({ loc: `${SITE}/finca/${f.slug}`, lastmod: f.created_at, freq: 'weekly' })),
    ...listings.map((l) => ({ loc: `${SITE}/anuncio/${l.slug}`, lastmod: l.created_at, freq: 'weekly' })),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) =>
    `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}<changefreq>${u.freq}</changefreq></url>`).join('\n')}\n</urlset>`
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(xml)
}
