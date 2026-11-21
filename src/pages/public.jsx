import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useAsync } from '../lib/useAsync'
import { BRAND, PROVINCES, money, slugify, waLink } from '../lib/config'
import { IcoMap, IcoArrow, IcoChevron, IcoFacebook, IcoGlobe, IcoInstagram, IcoMail, IcoPhone, IcoTikTok, IcoWhatsApp, CatIcon, handle } from '../components/icons'
import { FarmsMap } from '../components/FarmMap'
import { ACTIVITIES, PROVINCE_CENTER, activity } from '../lib/geo'
import { AdSlot, Ago, FavButton, Grid, Loading, PriceTable, Seo, Sparkline, Verified, ListingCard } from '../components/ui'

// Ordena el resumen de precios. En alza/baja, lo más reciente va primero ante empates.
export function sortPrices(list, order) {
  const l = [...list]
  const byDate = (a, b) => b.date.localeCompare(a.date)
  if (order === 'alza') return l.sort((a, b) => byDate(a, b) || b.change - a.change)
  if (order === 'baja') return l.sort((a, b) => byDate(a, b) || a.change - b.change)
  if (order === 'caro') return l.sort((a, b) => b.price - a.price)
  if (order === 'barato') return l.sort((a, b) => a.price - b.price)
  return l.sort((a, b) => a.product_name.localeCompare(b.product_name))
}

// Quita barras invertidas que quedan al pegar texto con formato (ej. "necesitas\\!")
export const cleanText = (t) => (t || '').replace(/\\([!.#*_\-()[\]+=~>|`{}])/g, '$1').trim()

const provBySlug = (s) => PROVINCES.find((p) => slugify(p) === s)

// ================================ HOME ================================
const ICONS = { ganaderia: '🐄', porcicultura: '🐖', avicultura: '🐓', ovinocultura: '🐐', agricultura: '🌱', insumos: '🧪', maquinaria: '🚜', servicios: '🩺', 'fincas-propiedades': '🏡' }

function HeroSearch({ cats }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [prov, setProv] = useState('')
  const submit = (e) => {
    e.preventDefault()
    const params = new URLSearchParams(); if (q) params.set('q', q)
    if (cat) return nav(`/c/${cat}${prov ? `/${slugify(prov)}` : ''}${q ? `?${params}` : ''}`)
    if (prov) params.set('prov', prov)
    nav(`/buscar${params.toString() ? `?${params}` : ''}`)
  }
  return (
    <form className="hsearch" onSubmit={submit} role="search" data-reveal="fade-up" style={{ '--d': '240ms' }}>
      <label className="hsearch__q"><span className="sr">¿Qué estás buscando?</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="¿Qué estás buscando?" /></label>
      <label><span className="sr">Categoría</span>
        <select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Todas las categorías</option>{cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
      <label><span className="sr">Provincia</span>
        <select value={prov} onChange={(e) => setProv(e.target.value)}><option value="">Todo Panamá</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></label>
      <button className="btn btn--fill">Explorar directorio</button>
    </form>
  )
}

export function Home() {
  const cats = useAsync(() => api.categories(), [])
  const featured = useAsync(() => api.listings({ featured: true, limit: 8 }), [])
  const recent = useAsync(() => api.listings({ limit: 8 }), [])
  const prices = useAsync(() => api.prices({ days: 10 }), [])
  const [priceView, setPriceView] = useState('alza')
  const homePrices = useMemo(() => {
    const all = prices.data
    if (!all) return null
    const FEATURED = ['name', 'yuca', 'otoe', 'platano', 'tomate', 'cebolla', 'papa', 'arroz', 'aji', 'zapallo', 'lechon', 'cerdo', 'ganado', 'novillo']
    const ima = all.filter((p) => p.source === 'IMA' && p.market === 'Merca Panamá')
    const today = ima.reduce((m, p) => (p.date > m ? p.date : m), '')
    const fresh = ima.filter((p) => p.date === today)
    if (priceView === 'alza') return sortPrices(fresh.filter((p) => p.change > 0), 'alza').slice(0, 8)
    if (priceView === 'baja') return sortPrices(fresh.filter((p) => p.change < 0), 'baja').slice(0, 8)
    const own = all.filter((p) => p.source !== 'IMA')
    return [...own, ...fresh.filter((p) => FEATURED.some((f) => p.product_slug.startsWith(f)))].slice(0, 8)
  }, [prices.data, priceView])
  const counts = useAsync(() => api.provinceCounts(), [])
  const roots = (cats.data || []).filter((c) => !c.parent_slug)
  return (
    <>
      <Seo description="Compra, vende y conecta con el agro panameño: animales, productos agrícolas, insumos, maquinaria, servicios y fincas por provincia."
        jsonld={{ '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND.name, url: BRAND.url,
          potentialAction: { '@type': 'SearchAction', target: `${BRAND.url}/buscar?q={q}`, 'query-input': 'required name=q' } }} />
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">{BRAND.tagline}</p>
          <h1 className="hero__title" data-reveal="blur-in">Compra, vende y conecta con el agro panameño</h1>
          <p className="hero__lead" data-reveal="fade-up" style={{ '--d': '120ms' }}>Animales, productos agrícolas, insumos, maquinaria, servicios y fincas de todo Panamá. Contacta directo al productor.</p>
          <HeroSearch cats={roots} />
        </div>
      </section>

      <section className="wrap section">
        <div className="section__head section__head--big" data-reveal="fade-up">
          <div><p className="kicker">Categorías</p><h2>Explora por categoría</h2></div>
          <Link className="more" to="/buscar" aria-label="Ver todo el directorio"><span className="more__t">Ver todo</span> <IcoArrow /></Link>
        </div>
        <div className="ccards">
          {roots.map((c, i) => (
            <Link key={c.slug} to={`/c/${c.slug}`} className={`ccard ccard--${c.slug}`} data-reveal="scale-in" style={{ '--d': `${Math.min(i, 8) * 60}ms` }}>
              <span className="ccard__media" aria-hidden="true">
                <img src={`/cat/${c.slug}.webp`} alt="" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.remove() }} />
                <CatIcon slug={c.slug} size={54} className="ccard__ph" />
              </span>
              <span className="ccard__foot">
                <CatIcon slug={c.slug} className="ccard__ico" />
                <span className="ccard__name">{c.name}</span>
                <span className="ccard__arr" aria-hidden="true"><IcoChevron size={15} /></span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="wrap"><AdSlot placement="home_top" /></div>

      <section className="wrap section">
        <div className="section__head" data-reveal="fade-up"><h2>Anuncios destacados</h2><Link className="more" to="/buscar" aria-label="Ver directorio"><span className="more__t">Ver directorio</span> <IcoArrow /></Link></div>
        <p className="muted small note">Los destacados tienen mayor visibilidad y se identifican con la etiqueta «Destacado».</p>
        <Grid items={featured.data} empty="Aún no hay anuncios destacados." />
      </section>

      <section className="wrap section">
        <div className="section__head" data-reveal="fade-up"><h2>Anuncios recientes</h2></div>
        <Grid items={recent.data} empty={<>Aún no hay anuncios. <Link to="/publicar">Publica el primero</Link>.</>} />
      </section>

      <section className="wrap section">
        <div className="section__head" data-reveal="fade-up"><h2>Explorar por provincia</h2></div>
        <div className="provs">
          {PROVINCES.map((p) => (
            <Link key={p} to={`/buscar?prov=${encodeURIComponent(p)}`} className="prov">
              <span>{p}</span><span className="muted">{counts.data?.[p] || 0}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <div className="section__head" data-reveal="fade-up"><h2>Fincas cerca de ti</h2><Link className="more" to="/mapa" aria-label="Abrir mapa"><span className="more__t">Abrir mapa</span> <IcoMap className="ico more__map" /><IcoArrow className="ico more__arr" /></Link></div>
        <FarmsMapPage embedded />
      </section>

      <section className="wrap section">
        <div className="section__head" data-reveal="fade-up"><h2>Precios del día</h2><Link className="more" to="/precios" aria-label="Ver todos los precios"><span className="more__t">Ver todos</span> <IcoArrow /></Link></div>
        <div className="chips" role="tablist">
          {[['alza', '▲ Mayores alzas'], ['baja', '▼ Mayores bajas'], ['destacados', 'Destacados']].map(([k, t]) => (
            <button key={k} role="tab" aria-selected={priceView === k} className={`chip ${priceView === k ? 'is-on' : ''}`} onClick={() => setPriceView(k)}>{t}</button>
          ))}
        </div>
        {homePrices && !homePrices.length && priceView !== 'destacados'
          ? <p className="empty">Hoy no hay {priceView === 'alza' ? 'alzas' : 'bajas'} respecto al día anterior en Merca Panamá.</p>
          : <PriceTable rows={homePrices} compact />}
        <p className="muted small">Merca Panamá · fuente <a href="https://sipan.ima.gob.pa" target="_blank" rel="noopener">IMA</a>. Variación contra el día anterior.</p>
      </section>

      <section className="wrap section">
        <div className="section__head" data-reveal="fade-up"><h2>Cómo funciona</h2></div>
        <div className="how">
          <div className="how__step" data-reveal="fade-up"><span className="how__n">1</span><h3>Busca</h3><p>Filtra por categoría y provincia, o escribe lo que necesitas.</p></div>
          <div className="how__step" data-reveal="fade-up"><span className="how__n">2</span><h3>Compara</h3><p>Revisa fotos, precio, ubicación y el perfil de cada productor.</p></div>
          <div className="how__step" data-reveal="fade-up"><span className="how__n">3</span><h3>Contacta</h3><p>Escribe directo por WhatsApp o llama. Sin intermediarios.</p></div>
        </div>
      </section>

      <section className="wrap section">
        <div className="pitch">
          <div>
            <h2>Publica tu anuncio</h2>
            <p>Conecta con compradores de todo Panamá. Publicar es gratis durante el lanzamiento; cada anuncio dura 30 días y puedes renovarlo. Revisamos cada anuncio antes de publicarlo.</p>
          </div>
          <ol className="steps">
            <li><strong>Crea tu cuenta</strong> con tu correo y WhatsApp.</li>
            <li><strong>Registra tu finca o negocio.</strong></li>
            <li><strong>Publica</strong> con fotos, precio y ubicación aproximada.</li>
            <li><strong>Recibe contactos</strong> en tu WhatsApp.</li>
          </ol>
          <Link to="/publicar" className="btn btn--accent">Publicar anuncio</Link>
        </div>
      </section>

      <section className="wrap section">
        <div className="trust card">
          <h2>Confianza y seguridad</h2>
          <ul>
            <li>Revisamos los anuncios antes de publicarlos y retiramos los que incumplen las normas.</li>
            <li>Visita la finca o paga contra entrega; no envíes adelantos a desconocidos.</li>
            <li>Pide registros sanitarios y guías de movilización cuando aplique.</li>
            <li>¿Algo sospechoso? Usa «Reportar anuncio» en cada ficha.</li>
          </ul>
          <Link to="/seguridad" className="btn btn--outline btn--sm">Ver recomendaciones</Link>
        </div>
      </section>
    </>
  )
}

// ================================ BÚSQUEDA ================================
export function Search() {
  const { cat, prov } = useParams()
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const q = sp.get('q') || ''
  const province = provBySlug(prov) || sp.get('prov') || ''
  const sort = sp.get('orden') || 'recent'
  const cats = useAsync(() => api.categories(), [])
  const res = useAsync(() => api.listings({ category: cat, province, q, sort }), [cat, province, q, sort])
  const catObj = (cats.data || []).find((c) => c.slug === cat)
  const title = [catObj?.name || (q ? `Resultados para "${q}"` : 'Directorio agropecuario'), province && `en ${province}`].filter(Boolean).join(' ')

  const go = (c, p) => {
    if (c) return nav(`/c/${c}${p ? `/${slugify(p)}` : ''}${q ? `?q=${encodeURIComponent(q)}` : ''}`)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (p) params.set('prov', p)
    nav(`/buscar${params.toString() ? `?${params}` : ''}`)
  }
  const roots = (cats.data || []).filter((c) => !c.parent_slug)
  const kids = (slug) => (cats.data || []).filter((c) => c.parent_slug === slug)
  const rootSel = catObj ? (catObj.parent_slug || catObj.slug) : ''

  return (
    <div className="wrap section">
      <Seo title={title} description={`${title}: anuncios de productores en Panamá con precio, ubicación y contacto por WhatsApp.`} />
      <nav className="crumbs"><Link to="/">Inicio</Link> / <Link to="/buscar">Directorio</Link>{catObj && <> / {catObj.name}</>}</nav>
      <h1 className="h1">{title}</h1>
      {/* Filtros compactos para celular: desplegables */}
      <div className="mfilters">
        <select value={cat || ''} onChange={(e) => go(e.target.value, province)} aria-label="Categoría" className="mfilters__cat">
          <option value="">Todas las categorías</option>
          {roots.map((r) => (
            <optgroup key={r.slug} label={r.name}>
              <option value={r.slug}>Todo {r.name.toLowerCase()}</option>
              {kids(r.slug).map((k) => <option key={k.slug} value={k.slug}>{k.name}</option>)}
            </optgroup>
          ))}
        </select>
        <div className="mfilters__row">
          <select value={province} onChange={(e) => go(cat, e.target.value)} aria-label="Provincia">
            <option value="">Todo Panamá</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select value={sort} onChange={(e) => { sp.set('orden', e.target.value); setSp(sp) }} aria-label="Ordenar">
            <option value="recent">Más recientes</option><option value="price">Menor precio</option>
          </select>
        </div>
      </div>
      <div className="search-layout">
        <aside className="filters card">
          <p className="filters__h">Categoría</p>
          <button className={`chip ${!cat ? 'is-on' : ''}`} onClick={() => go('', province)}>Todas</button>
          {roots.map((r) => (
            <div key={r.slug} className="filters__group">
              <button className={`chip ${cat === r.slug ? 'is-on' : ''}`} onClick={() => go(r.slug, province)}>{r.name}</button>
              <div className="filters__kids">
                {kids(r.slug).map((k) => <button key={k.slug} className={`chip chip--sm ${cat === k.slug ? 'is-on' : ''}`} onClick={() => go(k.slug, province)}>{k.name}</button>)}
              </div>
            </div>
          ))}
          <p className="filters__h">Provincia</p>
          <select value={province} onChange={(e) => go(cat, e.target.value)}>
            <option value="">Todo Panamá</option>
            {PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
          <p className="filters__h">Ordenar</p>
          <select value={sort} onChange={(e) => { sp.set('orden', e.target.value); setSp(sp) }}>
            <option value="recent">Más recientes</option>
            <option value="price">Menor precio</option>
          </select>
          <AdSlot placement="busqueda_lateral" />
        </aside>
        <div>
          {res.data && <p className="muted count">{res.data.length} anuncio{res.data.length === 1 ? '' : 's'}</p>}
          <Grid items={res.data} empty={<>No hay anuncios todavía aquí. <Link to="/publicar">¿Tienes este producto? Publícalo gratis</Link>.</>} />
        </div>
      </div>
    </div>
  )
}

// ================================ DETALLE DE ANUNCIO ================================
export function ListingPage() {
  const { slug } = useParams()
  const { data: l, loading } = useAsync(() => api.listing(slug), [slug])
  const [img, setImg] = useState(0)
  const [reported, setReported] = useState(false)
  useEffect(() => { if (l?.id) api.track(l.id, 'view').catch(() => {}) }, [l?.id])
  const related = useAsync(() => l ? api.listings({ category: l.category_slug, limit: 5 }) : Promise.resolve([]), [l?.id])
  if (loading) return <div className="wrap section"><Loading /></div>
  if (!l) return <NotFound />
  const f = l.farm || {}
  const text = `Hola ${f.name}, vi su anuncio "${l.title}" en ${BRAND.name}. ¿Sigue disponible?`
  const contact = () => api.track(l.id, 'contact').catch(() => {})
  const report = async () => {
    const reason = window.prompt('¿Qué problema tiene este anuncio? (estafa, precio falso, ya vendido, otro)')
    if (!reason) return
    await api.report(l.id, reason, ''); setReported(true)
  }
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Product', name: l.title, description: l.description, image: l.images,
    category: l.category?.name, ...(l.breed && { additionalProperty: { '@type': 'PropertyValue', name: 'Raza', value: l.breed } }),
    offers: { '@type': 'Offer', priceCurrency: 'USD', ...(l.price != null && { price: l.price }), availability: 'https://schema.org/InStock',
      areaServed: l.province, seller: { '@type': 'LocalBusiness', name: f.name, address: { '@type': 'PostalAddress', addressLocality: l.district, addressRegion: l.province, addressCountry: 'PA' } } },
  }
  return (
    <div className="wrap section">
      <Seo title={`${l.title} en ${l.district ? `${l.district}, ` : ''}${l.province}`} description={`${l.title} — ${money(l.price)} por ${l.unit}. ${l.description || ''}`.slice(0, 158)} jsonld={jsonld} />
      <nav className="crumbs"><Link to="/">Inicio</Link> / <Link to={`/c/${l.category_slug}`}>{l.category?.name}</Link> / <Link to={`/c/${l.category_slug}/${slugify(l.province)}`}>{l.province}</Link></nav>
      <div className="detail detail--listing">
        <div className="detail__gallery">
          <div className="gallery__main" style={l.images?.[img] ? { backgroundImage: `url(${l.images[img]})` } : undefined}>
            {!l.images?.length && <span className="muted">Sin fotos</span>}
          </div>
          {l.images?.length > 1 && (
            <div className="gallery__thumbs">
              {l.images.map((src, i) => <button key={src + i} onClick={() => setImg(i)} className={i === img ? 'is-on' : ''} style={{ backgroundImage: `url(${src})` }} aria-label={`Foto ${i + 1}`} />)}
            </div>
          )}
        </div>
        <div className="detail__info">
          <h2 className="h2">Descripción</h2>
          <p className="prose">{cleanText(l.description) || 'Sin descripción.'}</p>
          <dl className="specs">
            <div><dt>Categoría</dt><dd>{l.category?.name}</dd></div>
            {l.breed && <div><dt>Raza / variedad</dt><dd>{l.breed}</dd></div>}
            {l.quantity && <div><dt>Disponibles</dt><dd>{l.quantity}</dd></div>}
            <div><dt>Ubicación</dt><dd>{[l.district, l.province].map((x) => (x || '').trim()).filter(Boolean).join(', ')}</dd></div>
            <div><dt>Publicado</dt><dd><Ago iso={l.created_at} /></dd></div>
            <div><dt>Visitas</dt><dd>{l.views}</dd></div>
          </dl>
          <AdSlot placement="anuncio_inferior" />
        </div>
        <aside className="buybox card detail__buy">
          <div className="buybox__top">{l.featured ? <span className="tag tag--accent">Destacado</span> : <span />}<FavButton id={l.id} big /></div>
          <h1 className="buybox__title">{l.title}</h1>
          <p className="buybox__price">{money(l.price)} <span>/ {l.unit}</span></p>
          <a className="btn btn--wa btn--block" href={waLink(f.whatsapp, text)} target="_blank" rel="noopener" onClick={contact}><IcoWhatsApp size={22} /> Contactar por WhatsApp</a>
          {f.phone && <a className="btn btn--ghost btn--block" href={`tel:${f.phone}`} onClick={contact}><IcoPhone /> Llamar</a>}
          <Link to={`/finca/${f.slug}`} className="farmmini">
            {f.logo_url ? <img className="farmmini__avatar" src={f.logo_url} alt="" /> : <span className="farmmini__avatar">{(f.name || '?').slice(0, 1)}</span>}
            <span><strong>{f.name}</strong> {f.verified && <Verified />}<br /><span className="muted">{[f.district, f.province].map((x) => (x || '').trim()).filter(Boolean).join(', ')}</span></span>
            <IcoChevron className="ico farmmini__go" />
          </Link>
          <div className="safety">
            <strong>Compra segura:</strong> visita la finca o paga contra entrega. Nunca envíes dinero por adelantado a quien no conoces. <Link to="/seguridad">Más consejos</Link>
          </div>
          <button className="linkbtn" onClick={report} disabled={reported}>{reported ? 'Gracias, revisaremos el anuncio' : 'Reportar anuncio'}</button>
        </aside>
      </div>
      <div className="mobilebar">
        <span className="mobilebar__price">{money(l.price)}<small> / {l.unit}</small></span>
        {f.phone && <a className="btn btn--ghost mobilebar__call" href={`tel:${f.phone}`} onClick={contact} aria-label="Llamar"><IcoPhone /></a>}
        <a className="btn btn--wa" href={waLink(f.whatsapp, text)} target="_blank" rel="noopener" onClick={contact}><IcoWhatsApp size={20} /> WhatsApp</a>
      </div>
      <section className="section">
        <h2 className="h2">Anuncios similares</h2>
        <Grid items={related.data?.filter((x) => x.id !== l.id).slice(0, 4)} empty="No hay anuncios similares por ahora." />
      </section>
    </div>
  )
}

// ================================ FINCA ================================
export function FarmPage() {
  const { slug } = useParams()
  const { data: f, loading } = useAsync(() => api.farm(slug), [slug])
  if (loading) return <div className="wrap section"><Loading /></div>
  if (!f) return <NotFound />
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: f.name, description: f.description, url: `${BRAND.url}/finca/${f.slug}`,
    telephone: f.phone, email: f.email, image: f.cover_url, logo: f.logo_url,
    address: { '@type': 'PostalAddress', streetAddress: f.address, addressLocality: f.district, addressRegion: f.province, addressCountry: 'PA' },
    ...(f.lat && { geo: { '@type': 'GeoCoordinates', latitude: f.lat, longitude: f.lng } }),
    sameAs: [f.website, f.instagram && `https://instagram.com/${f.instagram}`, f.tiktok && `https://tiktok.com/@${f.tiktok}`, f.facebook && `https://facebook.com/${f.facebook}`].filter(Boolean),
  }
  return (
    <>
      <Seo title={`${f.name} — ${f.district ? `${f.district}, ` : ''}${f.province}`} description={(f.description || '').slice(0, 158)} jsonld={jsonld} />
      <section className="farmhero" style={f.cover_url ? { backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.65)),url(${f.cover_url})` } : undefined}>
        <div className="wrap">
          {f.logo_url && <img className="farmhero__logo" src={f.logo_url} alt={`Logo de ${f.name}`} />}
          <p className="eyebrow">{[f.district, f.province].map((x) => (x || '').trim()).filter(Boolean).join(', ')}</p>
          <h1 className="display display--md">{f.name}</h1>
          {f.verified && <span className="tag tag--light">✔ Finca verificada</span>}
        </div>
      </section>
      <div className="wrap section detail">
        <div>
          <h2 className="h2">Sobre la finca</h2>
          <p className="prose">{cleanText(f.description) || 'Esta finca aún no agregó una descripción.'}</p>
          <h2 className="h2">Productos disponibles ({f.listings.length})</h2>
          <Grid items={f.listings} empty="Esta finca no tiene anuncios activos." />
        </div>
        <aside className="buybox card">
          <a className="btn btn--wa btn--block" href={waLink(f.whatsapp, `Hola ${f.name}, los vi en ${BRAND.name}.`)} target="_blank" rel="noopener"><IcoWhatsApp size={22} /> WhatsApp</a>
          {f.phone && <a className="btn btn--ghost btn--block" href={`tel:${f.phone}`}><IcoPhone /> Llamar</a>}
          <div className="social">
            {f.instagram && <a className="social__btn social__btn--ig" href={`https://instagram.com/${handle(f.instagram)}`} target="_blank" rel="noopener" aria-label="Instagram" title={`Instagram @${handle(f.instagram)}`}><IcoInstagram /></a>}
            {f.facebook && <a className="social__btn social__btn--fb" href={`https://facebook.com/${handle(f.facebook)}`} target="_blank" rel="noopener" aria-label="Facebook" title="Facebook"><IcoFacebook /></a>}
            {f.tiktok && <a className="social__btn social__btn--tt" href={`https://tiktok.com/@${handle(f.tiktok)}`} target="_blank" rel="noopener" aria-label="TikTok" title={`TikTok @${handle(f.tiktok)}`}><IcoTikTok /></a>}
            {f.website && <a className="social__btn" href={f.website} target="_blank" rel="noopener" aria-label="Sitio web" title="Sitio web"><IcoGlobe /></a>}
            {f.email && <a className="social__btn" href={`mailto:${f.email}`} aria-label="Correo" title={f.email}><IcoMail /></a>}
          </div>
          {f.lat && <>
            <iframe title={`Mapa de ${f.name}`} className="map" loading="lazy" src={`https://www.google.com/maps?q=${f.lat},${f.lng}&z=13&output=embed`} />
            <a className="btn btn--ghost btn--block" href={`https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}`} target="_blank" rel="noopener">🧭 Cómo llegar</a>
          </>}
        </aside>
      </div>
    </>
  )
}

// ================================ MAPA DE FINCAS ================================
export function FarmsMapPage({ embedded = false }) {
  const nav = useNavigate()
  const { data } = useAsync(() => api.mapFarms(), [])
  const [acts, setActs] = useState([])
  const [prov, setProv] = useState('')
  const farms = useMemo(() => (data || []).filter((f) =>
    (!acts.length || (f.activities || []).some((a) => acts.includes(a))) && (!prov || f.province === prov)), [data, acts, prov])
  const focus = useMemo(() => (prov && PROVINCE_CENTER[prov] ? { center: PROVINCE_CENTER[prov], zoom: 9 } : null), [prov])
  const present = ACTIVITIES.filter((a) => (data || []).some((f) => (f.activities || []).includes(a.slug)))
  const toggle = (s) => setActs((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))
  // Los enlaces del globo del mapa navegan dentro de la app
  const onClick = (e) => { const a = e.target.closest('a[data-link]'); if (a) { e.preventDefault(); nav(a.getAttribute('href')) } }
  const Wrap = embedded ? 'div' : 'div'
  return (
    <Wrap className={embedded ? '' : 'wrap section'}>
      {!embedded && <>
        <Seo title="Mapa de fincas de Panamá" description="Mapa de fincas porcinas, ganaderas, avícolas y agrícolas de Panamá. Busca productores por zona y contáctalos directo." />
        <nav className="crumbs"><Link to="/">Inicio</Link> / <Link to="/fincas">Fincas</Link> / Mapa</nav>
        <h1 className="h1">Mapa de fincas</h1>
        <p className="lead">Encuentra productores cerca de ti. Toca un ícono para ver la finca y escribirle.</p>
      </>}
      <div className="mapbar">
        <div className="chips chips--scroll mapbar__chips">
          <button className={`chip ${!acts.length ? 'is-on' : ''}`} onClick={() => setActs([])}>Todas</button>
          {(present.length ? present : ACTIVITIES).map((a) => <button key={a.slug} className={`chip ${acts.includes(a.slug) ? 'is-on' : ''}`} onClick={() => toggle(a.slug)}>{a.icon} {a.name}</button>)}
        </div>
        <select className="mapbar__act" value={acts[0] || ''} onChange={(e) => setActs(e.target.value ? [e.target.value] : [])} aria-label="Actividad">
          <option value="">Todas las actividades</option>
          {(present.length ? present : ACTIVITIES).map((a) => <option key={a.slug} value={a.slug}>{a.icon} {a.name}</option>)}
        </select>
        <select className="inline-select" value={prov} onChange={(e) => setProv(e.target.value)} aria-label="Provincia">
          <option value="">Todo Panamá</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>
      <div onClick={onClick} className="mapwrap">
        <FarmsMap farms={farms} focus={focus} height={embedded ? 'min(60vh, 440px)' : 'min(68vh, 640px)'} lockText={embedded ? 'Toca para explorar el mapa' : 'Toca para mover el mapa'} />
        {data && <span className="mapcount">{farms.length} finca{farms.length === 1 ? '' : 's'} en el mapa</span>}
      </div>
      {!embedded && <p className="muted small">¿Tu finca no aparece? <Link to="/panel/finca">Marca su ubicación en tu panel</Link> o <Link to="/publicar">regístrala gratis</Link>.</p>}
    </Wrap>
  )
}

export function Farms() {
  const [prov, setProv] = useState('')
  const { data } = useAsync(() => api.farms({ province: prov }), [prov])
  return (
    <div className="wrap section">
      <Seo title="Directorio de fincas de Panamá" description="Fincas y productores agropecuarios de Panamá por provincia: porcinos, ganado, aves y cultivos." />
      <div className="section__head"><h1 className="h1" style={{ margin: 0 }}>Directorio de fincas</h1><Link className="more" to="/mapa" aria-label="Ver en el mapa"><span className="more__t">Ver en el mapa</span> <IcoMap className="ico more__map" /><IcoArrow className="ico more__arr" /></Link></div>
      <select className="inline-select" value={prov} onChange={(e) => setProv(e.target.value)}>
        <option value="">Todas las provincias</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}
      </select>
      {!data ? <Loading /> : !data.length ? <p className="empty">Aún no hay fincas en esta provincia. <Link to="/publicar">Registra la tuya</Link>.</p> : (
        <div className="grid">
          {data.map((f) => (
            <Link key={f.id} to={`/finca/${f.slug}`} className="card lcard">
              <div className="lcard__img lcard__img--wide" style={f.cover_url ? { backgroundImage: `url(${f.cover_url})` } : undefined}>{!f.cover_url && <span className="lcard__noimg">{f.name}</span>}</div>
              <div className="lcard__body">
                <h3 className="lcard__title">{f.name} {f.verified && <Verified />}</h3>
                <p className="lcard__meta">{[f.district, f.province].map((x) => (x || '').trim()).filter(Boolean).join(', ')}</p>
                <p className="muted clamp">{f.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ================================ PRECIOS ================================
export function Prices() {
  const [days, setDays] = useState(30)
  const markets = useAsync(() => api.priceMarkets({ days: 30 }), [])
  const [market, setMarket] = useState(null)
  const sel = market ?? (markets.data?.find((m) => m.market === 'Merca Panamá') ? 'Merca Panamá' : '')
  const { data } = useAsync(() => (markets.loading ? Promise.resolve(null) : api.prices({ days, market: sel || null })), [days, sel, markets.loading])
  const [q, setQ] = useState('')
  const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const [order, setOrder] = useState('az')
  const rows = useMemo(() => sortPrices((data || []).filter((p) => !q || norm(p.product_name).includes(norm(q))), order), [data, q, order])
  const last = (data || []).reduce((m, p) => (p.date > m ? p.date : m), '')
  return (
    <div className="wrap section">
      <Seo title="Precios agropecuarios del día en Panamá" description="Precios diarios de Merca Panamá, Mercado de San Felipe y otros mercados de Panamá (fuente IMA), más precios de lechones, ganado y productos del campo." />
      <h1 className="h1">Precios del día</h1>
      <p className="lead">Precios mayoristas oficiales del <a href="https://sipan.ima.gob.pa" target="_blank" rel="noopener">IMA (SIPAN)</a>, actualizados cada mañana, y precios reportados por productores. Los marcados como <span className="tag">Referencia</span> se calculan con los anuncios publicados y no son oficiales.</p>
      {markets.data?.length > 0 && (
        <div className="chips prices__chips" role="tablist">
          {markets.data.map((m) => (
            <button key={m.market} role="tab" aria-selected={sel === m.market} className={`chip ${sel === m.market ? 'is-on' : ''}`} onClick={() => setMarket(m.market)}>{m.market}</button>
          ))}
          <button role="tab" aria-selected={sel === ''} className={`chip ${sel === '' ? 'is-on' : ''}`} onClick={() => setMarket('')}>Todos</button>
        </div>
      )}
      {markets.data?.length > 0 && (
        <label className="secnav prices__mkt">
          <span className="secnav__l">Mercado</span>
          <select value={sel} onChange={(e) => setMarket(e.target.value)} aria-label="Mercado">
            {markets.data.map((m) => <option key={m.market} value={m.market}>{m.market}</option>)}
            <option value="">Todos los mercados</option>
          </select>
        </label>
      )}
      <div className="toolbar">
        <input placeholder="Buscar producto (ej. ñame, tomate, yuca)" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option><option value={90}>Últimos 90 días</option>
        </select>
        <select value={order} onChange={(e) => setOrder(e.target.value)} aria-label="Ordenar">
          <option value="az">Ordenar: A–Z</option><option value="alza">Mayor alza diaria</option><option value="baja">Mayor baja diaria</option>
          <option value="caro">Precio: mayor a menor</option><option value="barato">Precio: menor a mayor</option>
        </select>
      </div>
      {data && <p className="muted small">{rows.length} productos{last && ` · actualizado al ${last}`}</p>}
      <PriceTable rows={data ? rows : null} />
      <p className="muted small">¿Eres productor y conoces el precio de hoy en tu zona? <Link to="/panel/precio">Repórtalo desde tu panel</Link>.</p>
      <AdSlot placement="precios" />
    </div>
  )
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const fmtDate = (d) => { if (!d) return ''; const [y, m, dd] = d.split('-').map(Number); return `${dd} de ${MESES[m - 1]} de ${y}` }

export function ProductPrice() {
  const { slug } = useParams()
  const { data: rows, loading } = useAsync(() => api.productPrices(slug), [slug])
  if (loading) return <div className="wrap section"><Loading /></div>
  if (!rows?.length) return <NotFound />
  const name = rows[0].product_name
  const latest = []; const seen = new Set()
  for (const r of rows) { const k = r.market || r.source; if (!seen.has(k)) { seen.add(k); latest.push(r) } }
  const main = latest.find((r) => r.market === 'Merca Panamá') || latest[0]
  const series = rows.filter((r) => (r.market || r.source) === (main.market || main.source)).slice().reverse()
  const prev = series.length > 1 ? series.at(-2) : null
  const chg = prev ? (main.price - prev.price) / prev.price : 0
  const values = series.map((r) => Number(r.price))
  const lo = Math.min(...values), hi = Math.max(...values)
  return (
    <div className="wrap section">
      <Seo title={`Precio de ${name} hoy en Panamá (${fmtDate(main.date)})`}
        description={`${name}: ${money(main.price)} por ${main.unit} en ${main.market || 'Panamá'} el ${fmtDate(main.date)}. Historial de 60 días y precio por mercado. Fuente: IMA.`} />
      <nav className="crumbs"><Link to="/precios">Precios del día</Link> / {name}</nav>
      <h1 className="h1">Precio de {name} hoy en Panamá</h1>
      <div className="pp-hero card">
        <div>
          <p className="muted small">{main.market || main.source} · {fmtDate(main.date)}</p>
          <p className="pp-price">{money(main.price)} <span>/ {main.unit}</span></p>
          {main.price_min != null && Number(main.price_min) !== Number(main.price_max) && <p className="muted">Rango del día: {money(main.price_min)} – {money(main.price_max)}</p>}
          {main.origin && <p className="muted small">Origen: {main.origin}</p>}
        </div>
        <div className="pp-chg">
          <span className={chg > 0 ? 'up' : chg < 0 ? 'down' : ''}>{chg > 0 ? '▲' : chg < 0 ? '▼' : '='} {(Math.abs(chg) * 100).toFixed(1)}%</span>
          <span className="muted small">vs. día anterior</span>
        </div>
      </div>
      {values.length > 1 && (
        <section className="card pp-chart">
          <p className="filters__h">Tendencia · {series.length} días</p>
          <Sparkline values={values} w={640} h={120} stretch />
          <p className="muted small">Mínimo {money(lo)} · Máximo {money(hi)} en el periodo</p>
        </section>
      )}
      {latest.length > 1 && <>
        <h2 className="h2">Precio por mercado</h2>
        <PriceTable rows={latest.map((r) => ({ ...r, values: rows.filter((x) => (x.market || x.source) === (r.market || r.source)).map((x) => Number(x.price)).reverse(), change: 0 }))} compact />
      </>}
      <h2 className="h2">Historial</h2>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Fecha</th><th>Mercado</th><th>Precio</th></tr></thead>
        <tbody>{rows.slice(0, 60).map((r, i) => <tr key={i}><td className="muted">{r.date}</td><td>{r.market || r.source}</td><td className="num">{money(r.price)} / {r.unit}</td></tr>)}</tbody>
      </table></div>
      <p className="muted small">{rows.some((r) => r.source === 'IMA') ? <>Fuente: <a href="https://sipan.ima.gob.pa" target="_blank" rel="noopener">IMA – SIPAN</a>. Precios mayoristas de referencia.</> : <>Fuente: {main.source}. Precios de referencia.</>}</p>
      <div className="pitch card">
        <h2 className="h2">¿Produces o compras {name.toLowerCase()}?</h2>
        <p>Publica gratis tu cosecha y recibe clientes por WhatsApp, o busca productores cerca de ti.</p>
        <Link className="btn btn--fill" to="/publicar">Publicar gratis</Link>
        <Link className="btn btn--ghost" to={`/buscar?q=${encodeURIComponent(name.split(' ')[0])}`}>Buscar productores</Link>
      </div>
      <AdSlot placement="precios" />
    </div>
  )
}

export function Safety() {
  return (
    <div className="wrap section narrow">
      <Seo title="Compra segura" description="Consejos para comprar animales y productos agrícolas de forma segura en Panamá." />
      <h1 className="h1">Compra segura</h1>
      <ol className="prose list">
        <li>Prefiere fincas con el sello <Verified />: revisamos su identidad y ubicación.</li>
        <li>Visita la finca o pide una videollamada para ver los animales antes de pagar.</li>
        <li>No envíes adelantos a personas que no conoces. Paga contra entrega o en la finca.</li>
        <li>Pide registro de vacunas, guía de movilización y certificado sanitario cuando aplique.</li>
        <li>Desconfía de precios muy por debajo del <Link to="/precios">precio del día</Link>.</li>
        <li>Si algo no cuadra, usa el botón <strong>Reportar anuncio</strong>.</li>
      </ol>
    </div>
  )
}

export function DeleteAccount() {
  const { user } = useAuth()
  const msg = `Hola ${BRAND.name}, quiero eliminar mi cuenta y mis datos. Correo de la cuenta: ${user?.email || '(escribe tu correo)'}`
  return (
    <div className="wrap section narrow">
      <Seo title="Eliminar mi cuenta" description="Cómo solicitar la eliminación de tu cuenta y tus datos en FincaYa Panamá." />
      <h1 className="h1">Eliminar mi cuenta</h1>
      <p className="prose">Puedes pedir en cualquier momento que eliminemos tu cuenta de <strong>{BRAND.name}</strong> y los datos asociados. Lo hacemos en un máximo de <strong>7 días</strong> y te confirmamos por el mismo medio.</p>
      <h2 className="h2">Cómo solicitarlo</h2>
      <ol className="prose list">
        <li>Escríbenos por WhatsApp o correo desde el botón de abajo, indicando el correo con el que te registraste.</li>
        <li>Verificamos que la solicitud venga del dueño de la cuenta.</li>
        <li>Eliminamos la cuenta y te avisamos.</li>
      </ol>
      <div className="del-actions">
        <a className="btn btn--wa" href={waLink(BRAND.whatsapp, msg)} target="_blank" rel="noopener">Solicitar por WhatsApp</a>
        <a className="btn btn--ghost" href={`mailto:hola@fincayapanama.com?subject=${encodeURIComponent('Eliminar mi cuenta')}&body=${encodeURIComponent(msg)}`}>Solicitar por correo</a>
      </div>
      <h2 className="h2">Qué se elimina</h2>
      <ul className="prose list">
        <li>Tu cuenta (correo, nombre y teléfono).</li>
        <li>Tu finca, tus anuncios, fotos, favoritos y avisos.</li>
        <li>Los celulares registrados para notificaciones.</li>
      </ul>
      <h2 className="h2">Qué se conserva</h2>
      <ul className="prose list">
        <li>Las publicaciones ya hechas en nuestras redes sociales pueden permanecer hasta que las borremos manualmente (lo hacemos si lo pides).</li>
        <li>Registros técnicos anónimos y reportes de fraude, hasta 90 días, por seguridad.</li>
      </ul>
    </div>
  )
}

export function Privacy() {
  return (
    <div className="wrap section narrow">
      <Seo title="Términos y privacidad" />
      <h1 className="h1">Términos y privacidad</h1>
      <p className="prose">Borrador para revisión legal antes del lanzamiento.</p>
      <ol className="prose list">
        <li>Quien publica es responsable de la veracidad del anuncio y de cumplir los requisitos sanitarios y legales del producto o animal.</li>
        <li>Solo mostramos el teléfono, WhatsApp y ubicación que el productor autoriza. La ubicación exacta de la finca es opcional.</li>
        <li>Podemos retirar anuncios que incumplan las normas o que sean reportados como fraudulentos.</li>
        <li>Los anuncios aprobados pueden difundirse en las redes sociales de la plataforma, con consentimiento del productor.</li>
        <li>La publicidad pagada se identifica siempre como tal.</li>
        <li>Puedes pedir la eliminación de tu cuenta y tus datos escribiéndonos por WhatsApp.</li>
      </ol>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="wrap section narrow">
      <Seo title="Página no encontrada" />
      <h1 className="h1">No encontramos esa página</h1>
      <p>Puede que el anuncio haya vencido o se haya vendido. <Link to="/buscar">Ver anuncios activos</Link>.</p>
    </div>
  )
}

export { ListingCard }
