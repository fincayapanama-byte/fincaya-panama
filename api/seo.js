// HTML completo para buscadores, IA y vistas previas de WhatsApp/Facebook.
// Las personas reciben la app React normal; los bots reciben esta página (ver vercel.json).
import { q, esc, SITE, BRAND } from './_db.js'

const money = (n) => (n == null ? 'Consultar' : `B/. ${Number(n).toFixed(2)}`)

function page({ title, description, image, url, jsonld, body }) {
  return `<!doctype html><html lang="es-PA"><head><meta charset="utf-8">
<title>${esc(title)} | ${esc(BRAND)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(BRAND)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
${image ? `<meta property="og:image" content="${esc(image)}">` : ''}<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>
</head><body>${body}<p><a href="${SITE}">${esc(BRAND)}</a> · directorio agropecuario de Panamá</p></body></html>`
}

export default async function handler(req, res) {
  const path = String(req.query.path || '')
  const [, type, slug] = path.split('/')
  let html = null

  if (type === 'anuncio') {
    const [l] = await q(`listings?slug=eq.${encodeURIComponent(slug)}&status=eq.aprobado&select=*,farm:farms(*),category:categories(name)`)
    if (l) {
      const f = l.farm || {}
      const where = [l.district, l.province].filter(Boolean).join(', ')
      const title = `${l.title} en ${where}`
      const description = `${l.title}: ${money(l.price)} por ${l.unit}. ${l.description || ''}`.slice(0, 158)
      html = page({
        title, description, image: l.images?.[0], url: `${SITE}/anuncio/${l.slug}`,
        jsonld: { '@context': 'https://schema.org', '@type': 'Product', name: l.title, description: l.description, image: l.images, category: l.category?.name,
          ...(l.breed && { additionalProperty: { '@type': 'PropertyValue', name: 'Raza', value: l.breed } }),
          offers: { '@type': 'Offer', priceCurrency: 'USD', ...(l.price != null && { price: l.price }), availability: 'https://schema.org/InStock', url: `${SITE}/anuncio/${l.slug}`,
            seller: { '@type': 'LocalBusiness', name: f.name, url: `${SITE}/finca/${f.slug}`, telephone: f.phone,
              address: { '@type': 'PostalAddress', addressLocality: l.district, addressRegion: l.province, addressCountry: 'PA' } } } },
        body: `<h1>${esc(title)}</h1><p><strong>${money(l.price)}</strong> por ${esc(l.unit)}${l.quantity ? ` · ${l.quantity} disponibles` : ''}</p>
<p>Categoría: ${esc(l.category?.name)}${l.breed ? ` · Raza: ${esc(l.breed)}` : ''}</p><p>${esc(l.description)}</p>
<p>Vende: <a href="${SITE}/finca/${esc(f.slug)}">${esc(f.name)}</a>, ${esc(where)}. WhatsApp: ${esc(f.whatsapp)}</p>
${(l.images || []).map((src) => `<img src="${esc(src)}" alt="${esc(l.title)}">`).join('')}`,
      })
    }
  }

  if (type === 'finca') {
    const [f] = await q(`farms?slug=eq.${encodeURIComponent(slug)}&select=*`)
    if (f) {
      const ls = await q(`listings?farm_id=eq.${f.id}&status=eq.aprobado&select=title,slug,price,unit&order=created_at.desc`)
      const where = [f.district, f.province].filter(Boolean).join(', ')
      html = page({
        title: `${f.name} — ${where}`, description: (f.description || `Finca en ${where}, Panamá.`).slice(0, 158), image: f.cover_url, url: `${SITE}/finca/${f.slug}`,
        jsonld: { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: f.name, description: f.description, url: `${SITE}/finca/${f.slug}`, telephone: f.phone, email: f.email, image: f.cover_url,
          address: { '@type': 'PostalAddress', streetAddress: f.address, addressLocality: f.district, addressRegion: f.province, addressCountry: 'PA' },
          ...(f.lat && { geo: { '@type': 'GeoCoordinates', latitude: f.lat, longitude: f.lng } }),
          sameAs: [f.website, f.instagram && `https://instagram.com/${f.instagram}`, f.tiktok && `https://tiktok.com/@${f.tiktok}`].filter(Boolean) },
        body: `<h1>${esc(f.name)}</h1><p>${esc(where)}, Panamá${f.verified ? ' · Finca verificada' : ''}</p><p>${esc(f.description)}</p>
<h2>Productos</h2><ul>${ls.map((l) => `<li><a href="${SITE}/anuncio/${esc(l.slug)}">${esc(l.title)}</a> — ${money(l.price)} / ${esc(l.unit)}</li>`).join('')}</ul>`,
      })
    }
  }

  if (!html) { res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send('<h1>No encontrado</h1>'); return }
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400')
  res.status(200).send(html)
}
