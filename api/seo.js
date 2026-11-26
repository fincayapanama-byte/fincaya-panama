// HTML completo para buscadores, IA y vistas previas de WhatsApp/Facebook.
// Las personas reciben la app React normal; los bots reciben esta página (ver vercel.json).
import { q, esc, SITE, BRAND, slugify, PROV_BY_SLUG } from './_db.js'

const money = (n) => (n == null ? 'Consultar' : `B/. ${Number(n).toFixed(2)}`)
const daysAgo = (n) => new Date(Date.now() - 5 * 3600e3 - n * 864e5).toISOString().slice(0, 10)
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const fmtDate = (d) => { if (!d) return ''; const [y, m, dd] = String(d).slice(0, 10).split('-').map(Number); return `${dd} de ${MESES[m - 1]} de ${y}` }
const unitWord = (u) => (String(u || '').split(' ')[0] || 'kilo')
// Último registro por clave (las filas vienen ordenadas por fecha descendente)
const latestBy = (rows, key = (x) => x.product_slug) => { const seen = new Set(); return rows.filter((r) => { const k = key(r); if (seen.has(k)) return false; seen.add(k); return true }) }
const priceList = (list) => `<table><tr><th>Producto</th><th>Precio</th><th>Unidad</th></tr>${list.map((r) => `<tr><td><a href="${SITE}/precios/${esc(r.product_slug)}">${esc(r.product_name)}</a></td><td>${money(r.price)}</td><td>${esc(r.unit)}</td></tr>`).join('')}</table>`

// Variantes con las que la gente escribe la marca
const ALT_NAMES = ['FincaYaPanamá', 'FincaYa Panama', 'Finca Ya Panamá', 'fincayapanama', 'FincaYa', 'Fincaya', 'FincaYaPa', 'Fincayapa']
const DEFAULT_IMAGE = `${SITE}/logo-completo.png`
const NAV = `<nav aria-label="Principal"><a href="${SITE}/">Inicio</a> · <a href="${SITE}/precios">Precios del día</a> · <a href="${SITE}/fincas">Fincas</a> · <a href="${SITE}/mapa">Mapa de fincas</a> · <a href="${SITE}/seguridad">Compra segura</a> · <a href="${SITE}/acerca">Acerca de</a> · <a href="${SITE}/preguntas-frecuentes">Preguntas frecuentes</a> · <a href="${SITE}/publicar">Publicar un anuncio</a></nav>`
const maxDate = (rows, f) => rows.map(f).filter(Boolean).map((d) => String(d).slice(0, 10)).sort().at(-1) || ''

function page({ title, fullTitle, description, image, url, jsonld, body, noindex, crumbs }) {
  const ld = Array.isArray(jsonld) ? [...jsonld] : jsonld ? [jsonld] : []
  if (crumbs?.length) ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) })
  const crumbHtml = crumbs?.length ? `<nav aria-label="Migas de pan">${crumbs.map(([name, item], i) => (i < crumbs.length - 1 ? `<a href="${esc(item)}">${esc(name)}</a>` : esc(name))).join(' › ')}</nav>` : ''
  const shown = fullTitle || `${title} | ${BRAND}`
  return `<!doctype html><html lang="es-PA"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(shown)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
${noindex ? '<meta name="robots" content="noindex, follow">\n' : ''}<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(BRAND)}"><meta property="og:locale" content="es_PA">
<meta property="og:title" content="${esc(fullTitle || title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image || DEFAULT_IMAGE)}"><meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
${ld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('')}
</head><body><header><p><a href="${SITE}/"><strong>${esc(BRAND)}</strong></a></p>${NAV}</header><main>${crumbHtml}${body}</main><footer><p><a href="${SITE}">${esc(BRAND)}</a> · directorio agropecuario de Panamá</p></footer></body></html>`
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
      const posted = (l.approved_at || l.created_at || '').slice(0, 10)
      html = page({
        title, description, image: l.images?.[0], url: `${SITE}/anuncio/${l.slug}`,
        crumbs: [['Inicio', `${SITE}/`], ...(l.category?.name ? [[l.category.name, `${SITE}/c/${l.category_slug}`]] : []), [l.title, `${SITE}/anuncio/${l.slug}`]],
        jsonld: { '@context': 'https://schema.org', '@type': 'Product', name: l.title, description: l.description, image: l.images, category: l.category?.name,
          ...(l.breed && { additionalProperty: { '@type': 'PropertyValue', name: 'Raza', value: l.breed } }),
          offers: { '@type': 'Offer', priceCurrency: 'USD', ...(l.price != null && { price: l.price }), availability: 'https://schema.org/InStock', url: `${SITE}/anuncio/${l.slug}`,
            ...(l.expires_at && { priceValidUntil: String(l.expires_at).slice(0, 10) }),
            seller: { '@type': 'LocalBusiness', name: f.name, url: `${SITE}/finca/${f.slug}`, telephone: f.phone,
              address: { '@type': 'PostalAddress', addressLocality: l.district, addressRegion: l.province, addressCountry: 'PA' } } } },
        body: `<h1>${esc(title)}</h1><p><strong>${money(l.price)}</strong> por ${esc(l.unit)}${l.quantity ? ` · ${l.quantity} disponibles` : ''}</p>
<p>Categoría: ${esc(l.category?.name)}${l.breed ? ` · Raza: ${esc(l.breed)}` : ''}</p><p>${esc(l.description)}</p>
<p>Vende: <a href="${SITE}/finca/${esc(f.slug)}">${esc(f.name)}</a>, ${esc(where)}. WhatsApp: ${esc(f.whatsapp)}</p>
${posted ? `<p>Publicado el ${esc(fmtDate(posted))}.</p>` : ''}
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
        crumbs: [['Inicio', `${SITE}/`], ['Fincas', `${SITE}/fincas`], [f.name, `${SITE}/finca/${f.slug}`]],
        jsonld: { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: f.name, description: f.description, url: `${SITE}/finca/${f.slug}`, telephone: f.phone, email: f.email, image: f.cover_url,
          address: { '@type': 'PostalAddress', streetAddress: f.address, addressLocality: f.district, addressRegion: f.province, addressCountry: 'PA' },
          ...(f.lat && { geo: { '@type': 'GeoCoordinates', latitude: f.lat, longitude: f.lng } }),
          sameAs: [f.website, f.instagram && `https://instagram.com/${f.instagram}`, f.tiktok && `https://tiktok.com/@${f.tiktok}`].filter(Boolean) },
        body: `<h1>${esc(f.name)}</h1><p>${esc(where)}, Panamá${f.verified ? ' · Finca verificada' : ''}</p><p>${esc(f.description)}</p>
<h2>Productos</h2><ul>${ls.map((l) => `<li><a href="${SITE}/anuncio/${esc(l.slug)}">${esc(l.title)}</a> — ${money(l.price)} / ${esc(l.unit)}</li>`).join('')}</ul>`,
      })
    }
  }

  // ---------- Portada ----------
  if (path === '/' || path === '') {
    const [ls, prices, cats] = await Promise.all([
      q('listings?status=eq.aprobado&select=title,slug,price,unit,province&order=created_at.desc&limit=24'),
      q(`prices?source=eq.IMA&market=eq.${encodeURIComponent('Merca Panamá')}&date=gte.${daysAgo(4)}&select=product_slug,product_name,unit,price,date&order=date.desc&limit=400`),
      q('categories?parent_slug=is.null&select=slug,name&order=sort'),
    ])
    const latest = latestBy(prices)
    html = page({
      title: 'Anuncios Agropecuarios y Fincas en Panamá', fullTitle: `${BRAND} | Anuncios Agropecuarios y Fincas en Panamá`,
      description: 'Encuentra ganado, lechones, productos agrícolas, maquinaria y productores en Panamá. Explora fincas por provincia y publica tus anuncios agropecuarios.',
      image: DEFAULT_IMAGE, url: `${SITE}/`,
      jsonld: [{ '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${SITE}/#website`, name: BRAND, alternateName: ALT_NAMES, url: `${SITE}/`, inLanguage: 'es-PA', publisher: { '@id': `${SITE}/#organization` },
        potentialAction: { '@type': 'SearchAction', target: `${SITE}/buscar?q={q}`, 'query-input': 'required name=q' } },
        { '@context': 'https://schema.org', '@type': 'Organization', '@id': `${SITE}/#organization`, name: BRAND, alternateName: ALT_NAMES, url: `${SITE}/`, logo: `${SITE}/logo.png`, areaServed: 'PA',
          sameAs: ['https://instagram.com/fincayapanama', 'https://facebook.com/fincayapanama'],
          contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', telephone: '+507-6291-3387', availableLanguage: 'es' } }],
      body: `<h1>Compra y vende productos agropecuarios en Panamá</h1>
<p>${esc(BRAND)} (también escrito FincaYaPanamá) es un directorio agropecuario de Panamá. Productores de todo el país publican gratis su ganado, cerdos, aves, cosechas, maquinaria e insumos. Los compradores contactan directo por WhatsApp, sin intermediarios.</p>
<h2>Categorías</h2><ul>${cats.map((c) => `<li><a href="${SITE}/c/${esc(c.slug)}">${esc(c.name)} en Panamá</a></li>`).join('')}</ul>
<h2>Precios del día en Merca Panamá</h2>${latest[0]?.date ? `<p>Fuente: Instituto de Mercadeo Agropecuario (IMA). Actualizado: ${esc(fmtDate(latest[0].date))}.</p>` : ''}${priceList(latest.slice(0, 40))}<p><a href="${SITE}/precios">Ver todos los precios del día</a></p>
<h2>Anuncios recientes</h2><ul>${ls.map((l) => `<li><a href="${SITE}/anuncio/${esc(l.slug)}">${esc(l.title)}</a> — ${money(l.price)} / ${esc(l.unit)} (${esc(l.province)})</li>`).join('')}</ul>
<p><a href="${SITE}/fincas">Directorio de fincas</a> · <a href="${SITE}/mapa">Mapa de fincas</a> · <a href="${SITE}/seguridad">Compra segura</a></p>`,
    })
  }

  // ---------- Precios del día ----------
  if (path === '/precios') {
    const rows = await q(`prices?approved=eq.true&date=gte.${daysAgo(4)}&select=product_slug,product_name,unit,price,price_min,price_max,market,date&order=date.desc&limit=3000`)
    const byMarket = {}
    for (const r of latestBy(rows, (x) => `${x.product_slug}|${x.market}`)) (byMarket[r.market || 'Reportes de productores'] ||= []).push(r)
    const day = rows[0]?.date || ''
    html = page({
      title: `Precios agropecuarios de hoy en Panamá${day ? ` (${fmtDate(day)})` : ''}`,
      description: `Precios mayoristas del día en Merca Panamá, Mercado de San Felipe y otros mercados: ñame, yuca, plátano, tomate, cebolla, arroz y más. Fuente: IMA. Actualizado a diario.`,
      image: DEFAULT_IMAGE, url: `${SITE}/precios`,
      crumbs: [['Inicio', `${SITE}/`], ['Precios del día', `${SITE}/precios`]],
      jsonld: { '@context': 'https://schema.org', '@type': 'Dataset', name: 'Precios agropecuarios diarios de Panamá', url: `${SITE}/precios`,
        description: 'Precios mayoristas diarios por producto y mercado en Panamá.', creator: { '@type': 'Organization', name: BRAND },
        isBasedOn: 'https://sipan.ima.gob.pa', spatialCoverage: 'Panamá', dateModified: day, license: 'https://sipan.ima.gob.pa' },
      body: `<h1>Precios agropecuarios de hoy en Panamá</h1><p>Actualizado: ${esc(fmtDate(day))}. Fuente oficial: Instituto de Mercadeo Agropecuario (IMA).</p>
${Object.entries(byMarket).map(([m, list]) => `<h2>${esc(m)}</h2>${priceList(list.sort((a, b) => a.product_name.localeCompare(b.product_name)))}`).join('')}`,
    })
  }

  // ---------- Precio de un producto ----------
  if (type === 'precios' && slug) {
    const rows = await q(`prices?product_slug=eq.${encodeURIComponent(slug)}&approved=eq.true&date=gte.${daysAgo(60)}&select=product_name,unit,price,price_min,price_max,market,origin,source,date&order=date.desc&limit=2000`)
    if (rows.length) {
      const name = rows[0].product_name
      const last = latestBy(rows, (x) => x.market || x.source)
      const main = last.find((r) => r.market === 'Merca Panamá') || last[0]
      const prev = rows.find((r) => r.market === main.market && r.date < main.date)
      const chg = prev ? ((main.price - prev.price) / prev.price) * 100 : 0
      const title = `Precio de ${name} hoy en Panamá (${fmtDate(main.date)})`
      const description = `${name}: ${money(main.price)} por ${main.unit} en ${main.market || 'Panamá'} el ${fmtDate(main.date)}${main.price_min != null ? ` (rango ${money(main.price_min)} – ${money(main.price_max)})` : ''}. Historial de 60 días y precios por mercado. Fuente: IMA.`
      const faq = [
        [`¿Cuánto cuesta el ${unitWord(main.unit)} de ${name.toLowerCase()} hoy en Panamá?`, `El ${fmtDate(main.date)} el ${name.toLowerCase()} se vendió a ${money(main.price)} por ${main.unit} en promedio en ${main.market || 'Panamá'}${main.price_min != null ? `, con un rango de ${money(main.price_min)} a ${money(main.price_max)}` : ''}.`],
        [`¿Subió o bajó el precio del ${name.toLowerCase()}?`, prev ? `Frente al ${fmtDate(prev.date)} ${chg > 0 ? `subió ${chg.toFixed(1)}%` : chg < 0 ? `bajó ${Math.abs(chg).toFixed(1)}%` : 'se mantuvo igual'}.` : 'Aún no hay un día anterior para comparar.'],
        [`¿De dónde sale este precio?`, 'Del reporte diario de precios mayoristas del Instituto de Mercadeo Agropecuario (IMA) de Panamá, publicado en sipan.ima.gob.pa.'],
      ]
      html = page({
        title, description, image: DEFAULT_IMAGE, url: `${SITE}/precios/${slug}`,
        crumbs: [['Inicio', `${SITE}/`], ['Precios del día', `${SITE}/precios`], [name, `${SITE}/precios/${slug}`]],
        jsonld: [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q2, a]) => ({ '@type': 'Question', name: q2, acceptedAnswer: { '@type': 'Answer', text: a } })) },
          { '@context': 'https://schema.org', '@type': 'Dataset', name: `Precio diario de ${name} en Panamá`, url: `${SITE}/precios/${slug}`, description,
            isBasedOn: 'https://sipan.ima.gob.pa', spatialCoverage: 'Panamá', dateModified: main.date, creator: { '@type': 'Organization', name: BRAND } }],
        body: `<h1>Precio de ${esc(name)} hoy en Panamá</h1>
<p><strong>${money(main.price)}</strong> por ${esc(main.unit)} · ${esc(main.market || '')} · ${esc(fmtDate(main.date))}${prev ? ` · ${chg > 0 ? '▲' : chg < 0 ? '▼' : '='} ${Math.abs(chg).toFixed(1)}% vs. día anterior` : ''}</p>
<h2>Precio por mercado</h2><table><tr><th>Mercado</th><th>Promedio</th><th>Mínimo</th><th>Máximo</th><th>Origen</th><th>Fecha</th></tr>
${last.map((r) => `<tr><td>${esc(r.market || r.source)}</td><td>${money(r.price)}</td><td>${money(r.price_min)}</td><td>${money(r.price_max)}</td><td>${esc(r.origin || '')}</td><td>${esc(r.date)}</td></tr>`).join('')}</table>
<h2>Historial (últimos 60 días)</h2><table><tr><th>Fecha</th><th>Mercado</th><th>Precio</th></tr>
${rows.slice(0, 120).map((r) => `<tr><td>${esc(r.date)}</td><td>${esc(r.market || r.source)}</td><td>${money(r.price)} / ${esc(r.unit)}</td></tr>`).join('')}</table>
<h2>Preguntas frecuentes</h2>${faq.map(([q2, a]) => `<h3>${esc(q2)}</h3><p>${esc(a)}</p>`).join('')}
<p><a href="${SITE}/buscar?q=${encodeURIComponent(name)}">Ver anuncios de ${esc(name)} de productores</a> · <a href="${SITE}/precios">Todos los precios del día</a></p>`,
      })
    }
  }

  // ---------- Categoría (y provincia) ----------
  if (type === 'c' && slug) {
    const prov = path.split('/')[3]
    const provName = prov ? PROV_BY_SLUG[prov] : ''
    const [cat] = await q(`categories?slug=eq.${encodeURIComponent(slug)}&select=slug,name,parent_slug`)
    if (cat && (!prov || provName)) {
      const [kids, parent] = await Promise.all([
        q(`categories?parent_slug=eq.${encodeURIComponent(cat.slug)}&select=slug,name&order=sort`),
        cat.parent_slug ? q(`categories?slug=eq.${encodeURIComponent(cat.parent_slug)}&select=slug,name`) : Promise.resolve([]),
      ])
      // Igual que la app: una categoría principal incluye los anuncios de sus subcategorías
      const slugs = [cat.slug, ...kids.map((k) => k.slug)]
      const ls = await q(`listings?status=eq.aprobado&category_slug=in.(${slugs.join(',')})${provName ? `&province=eq.${encodeURIComponent(provName)}` : ''}&select=title,slug,price,unit,province,district,category_slug,approved_at,created_at&order=created_at.desc&limit=200`)
      const where = provName ? `${provName}, Panamá` : 'Panamá'
      const url = `${SITE}/c/${cat.slug}${provName ? `/${prov}` : ''}`
      const count = ls.length >= 200 ? 'Más de 200' : String(ls.length)
      const updated = maxDate(ls, (l) => l.approved_at || l.created_at)
      const provs = provName ? [] : [...new Set(ls.map((l) => l.province))].filter((p) => PROV_BY_SLUG[slugify(p)])
      const subs = kids.filter((k) => ls.some((l) => l.category_slug === k.slug))
      html = page({
        title: `${cat.name} en venta en ${where}`,
        description: ls.length
          ? `${count} anuncios de ${cat.name.toLowerCase()} en ${where}: precios, fotos y contacto directo con productores por WhatsApp.`
          : `Anuncios de ${cat.name.toLowerCase()} en ${where}. Publica el tuyo gratis y contacta a los productores por WhatsApp.`,
        image: DEFAULT_IMAGE, url,
        // Sin anuncios la página es delgada: se deja fuera del índice pero se siguen sus enlaces
        noindex: !ls.length,
        crumbs: [['Inicio', `${SITE}/`], ...(parent[0] ? [[parent[0].name, `${SITE}/c/${parent[0].slug}`]] : []), [cat.name, `${SITE}/c/${cat.slug}`], ...(provName ? [[provName, url]] : [])],
        jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${cat.name} en ${where}`, url, inLanguage: 'es-PA', isPartOf: { '@type': 'WebSite', name: BRAND, url: `${SITE}/` },
          ...(ls.length && { mainEntity: { '@type': 'ItemList', numberOfItems: Math.min(ls.length, 50),
            itemListElement: ls.slice(0, 50).map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/anuncio/${l.slug}`, name: l.title })) } }) },
        body: `<h1>${esc(cat.name)} en venta en ${esc(where)}</h1>
${updated ? `<p>Actualizado: ${esc(fmtDate(updated))}.</p>` : ''}
<ul>${ls.map((l) => `<li><a href="${SITE}/anuncio/${esc(l.slug)}">${esc(l.title)}</a> — ${money(l.price)} / ${esc(l.unit)} · ${esc([l.district, l.province].filter(Boolean).join(', '))}</li>`).join('') || '<li>Aún no hay anuncios. Publica el tuyo gratis.</li>'}</ul>
${subs.length ? `<h2>Subcategorías</h2><ul>${subs.map((k) => `<li><a href="${SITE}/c/${esc(k.slug)}">${esc(k.name)}</a></li>`).join('')}</ul>` : ''}
${provs.length ? `<h2>${esc(cat.name)} por provincia</h2><ul>${provs.map((p) => `<li><a href="${SITE}/c/${esc(cat.slug)}/${slugify(p)}">${esc(cat.name)} en ${esc(p)}</a></li>`).join('')}</ul>` : ''}
${provName ? `<p><a href="${SITE}/c/${esc(cat.slug)}">${esc(cat.name)} en todo Panamá</a></p>` : ''}
<p><a href="${SITE}/publicar">Publica gratis tus anuncios de ${esc(cat.name.toLowerCase())}</a></p>`,
      })
    }
  }

  // ---------- Directorio de fincas ----------
  if (path === '/fincas') {
    const fs = await q('farms?select=name,slug,province,district,verified&order=verified.desc&limit=500')
    html = page({
      title: 'Directorio de fincas y productores de Panamá', description: `${fs.length} fincas y productores agropecuarios de Panamá con contacto directo por WhatsApp.`,
      image: DEFAULT_IMAGE, url: `${SITE}/fincas`,
      crumbs: [['Inicio', `${SITE}/`], ['Fincas', `${SITE}/fincas`]],
      jsonld: { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Fincas de Panamá', itemListElement: fs.slice(0, 100).map((f, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/finca/${f.slug}`, name: f.name })) },
      body: `<h1>Directorio de fincas de Panamá</h1><ul>${fs.map((f) => `<li><a href="${SITE}/finca/${esc(f.slug)}">${esc(f.name)}</a> — ${esc([f.district, f.province].filter(Boolean).join(', '))}${f.verified ? ' · verificada' : ''}</li>`).join('')}</ul>
<p><a href="${SITE}/mapa">Ver las fincas en el mapa</a></p>`,
    })
  }

  // ---------- Mapa de fincas (lista de las fincas que aparecen en el mapa) ----------
  if (path === '/mapa') {
    const all = await q('farms?lat=not.is.null&select=name,slug,province,district,verified,show_on_map&order=verified.desc&limit=500')
    const fs = all.filter((f) => f.show_on_map !== false)
    const byProv = {}
    for (const f of fs) (byProv[f.province || 'Panamá'] ||= []).push(f)
    html = page({
      title: 'Mapa de fincas de Panamá', description: 'Mapa de fincas porcinas, ganaderas, avícolas y agrícolas de Panamá. Busca productores por zona y contáctalos directo.',
      image: DEFAULT_IMAGE, url: `${SITE}/mapa`, noindex: !fs.length,
      crumbs: [['Inicio', `${SITE}/`], ['Fincas', `${SITE}/fincas`], ['Mapa', `${SITE}/mapa`]],
      jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Mapa de fincas de Panamá', url: `${SITE}/mapa`, inLanguage: 'es-PA', isPartOf: { '@type': 'WebSite', name: BRAND, url: `${SITE}/` } },
      body: `<h1>Mapa de fincas de Panamá</h1><p>Encuentra productores cerca de ti. El mapa interactivo muestra las fincas con su ubicación; aquí tienes la lista por provincia.</p>
${Object.entries(byProv).map(([p, list]) => `<h2>${esc(p)}</h2><ul>${list.map((f) => `<li><a href="${SITE}/finca/${esc(f.slug)}">${esc(f.name)}</a>${f.district ? ` — ${esc(f.district)}` : ''}${f.verified ? ' · verificada' : ''}</li>`).join('')}</ul>`).join('')}
<p><a href="${SITE}/fincas">Directorio completo de fincas</a></p>`,
    })
  }

  // ---------- Compra segura ----------
  if (path === '/seguridad') {
    html = page({
      title: 'Compra segura', description: 'Consejos para comprar animales y productos agrícolas de forma segura en Panamá.',
      image: DEFAULT_IMAGE, url: `${SITE}/seguridad`,
      crumbs: [['Inicio', `${SITE}/`], ['Compra segura', `${SITE}/seguridad`]],
      jsonld: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Compra segura', url: `${SITE}/seguridad`, inLanguage: 'es-PA', isPartOf: { '@type': 'WebSite', name: BRAND, url: `${SITE}/` } },
      body: `<h1>Compra segura</h1>
<ol>
<li>Prefiere fincas con el sello de finca verificada: revisamos su identidad y ubicación.</li>
<li>Visita la finca o pide una videollamada para ver los animales antes de pagar.</li>
<li>No envíes adelantos a personas que no conoces. Paga contra entrega o en la finca.</li>
<li>Pide registro de vacunas, guía de movilización y certificado sanitario cuando aplique.</li>
<li>Desconfía de precios muy por debajo del <a href="${SITE}/precios">precio del día</a>.</li>
<li>Si algo no cuadra, usa el botón «Reportar anuncio».</li>
</ol>`,
    })
  }

  // ---------- Acerca de ----------
  if (path === '/acerca') {
    html = page({
      title: 'Acerca de FincaYaPanamá', description: 'FincaYaPanamá, también conocida como FincaYa Panamá, es la plataforma digital que conecta a productores, compradores y vendedores del sector agropecuario de Panamá.',
      image: DEFAULT_IMAGE, url: `${SITE}/acerca`,
      crumbs: [['Inicio', `${SITE}/`], ['Acerca de', `${SITE}/acerca`]],
      jsonld: { '@context': 'https://schema.org', '@type': 'AboutPage', name: 'Acerca de FincaYaPanamá', url: `${SITE}/acerca`, inLanguage: 'es-PA', about: { '@id': `${SITE}/#organization` }, isPartOf: { '@type': 'WebSite', name: BRAND, url: `${SITE}/` } },
      body: `<h1>Acerca de FincaYaPanamá</h1>
<p><strong>Conectamos el campo panameño con nuevas oportunidades.</strong></p>
<p>FincaYaPanamá, también conocida como FincaYa Panamá, nace como una iniciativa para transformar la manera en que los productores agropecuarios de Panamá promocionan sus fincas, comercializan sus productos y conectan con potenciales compradores.</p>
<p>Somos una plataforma digital especializada en el sector agropecuario panameño, donde puedes comprar, vender, publicar anuncios, registrar tu finca, encontrar productores y consultar <a href="${SITE}/precios">precios de referencia</a> del mercado.</p>
<h2>Nuestra misión</h2>
<p>Acercar la tecnología al campo, facilitar el comercio directo y fortalecer la economía de nuestros productores.</p>
<h2>Nuestra visión</h2>
<p>Convertirnos en el directorio y marketplace agropecuario más grande y confiable de Panamá.</p>
<p><strong>FincaYaPanamá: el campo panameño conectado.</strong></p>
<p>Sitio web oficial: <a href="${SITE}">https://fincayapanama.com</a></p>
<p><a href="${SITE}/preguntas-frecuentes">Preguntas frecuentes</a> · <a href="${SITE}/seguridad">Compra segura</a> · <a href="${SITE}/publicar">Publicar un anuncio</a></p>`,
    })
  }

  // ---------- Preguntas frecuentes ----------
  if (path === '/preguntas-frecuentes') {
    const FAQ = [["¿Qué es FincaYaPanamá?", "FincaYaPanamá, también escrita FincaYa Panamá, es una plataforma digital de anuncios y directorio agropecuario que conecta a productores y compradores de todo Panamá."], ["¿Dónde publicar anuncios agropecuarios en Panamá?", "En FincaYaPanamá.com puedes publicar gratuitamente anuncios de ganado, lechones, aves, cosechas, productos agrícolas y otros productos del sector agropecuario."], ["¿Dónde comprar animales y productos agropecuarios en Panamá?", "FincaYaPanamá permite buscar anuncios y contactar directamente con productores agropecuarios por categoría, provincia y distrito, según la disponibilidad publicada."], ["¿Puedo registrar mi finca aunque no tenga productos para vender?", "Sí. Puedes registrar tu finca en el directorio agropecuario de FincaYaPanamá para darle visibilidad y facilitar que potenciales compradores conozcan tu actividad productiva."], ["¿FincaYaPanamá y FincaYa Panamá son la misma plataforma?", "Sí. Ambos nombres hacen referencia a la misma plataforma agropecuaria panameña, cuyo sitio web oficial es https://fincayapanama.com."]]
    html = page({
      title: 'Preguntas frecuentes', description: 'Respuestas sobre FincaYaPanamá: dónde publicar anuncios agropecuarios, comprar animales y productos del campo y registrar tu finca en Panamá.',
      image: DEFAULT_IMAGE, url: `${SITE}/preguntas-frecuentes`,
      crumbs: [['Inicio', `${SITE}/`], ['Preguntas frecuentes', `${SITE}/preguntas-frecuentes`]],
      jsonld: { '@context': 'https://schema.org', '@type': 'FAQPage', url: `${SITE}/preguntas-frecuentes`, inLanguage: 'es-PA', mainEntity: FAQ.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) },
      body: `<h1>Preguntas frecuentes</h1>
${FAQ.map(([qn, a]) => `<h2>${esc(qn)}</h2><p>${esc(a)}</p>`).join('\n')}
<p><a href="${SITE}/acerca">Conoce más sobre nosotros</a></p>`,
    })
  }

  if (!html) { res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').setHeader('Cache-Control', 's-maxage=60').send('<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><h1>No encontrado</h1>'); return }
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400')
  res.status(200).send(html)
}
