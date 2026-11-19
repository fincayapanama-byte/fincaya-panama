import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { BRAND, PROVINCES, money, slugify, waLink } from '../lib/config'
import { IcoArrow, IcoChevron, IcoFacebook, IcoGlobe, IcoInstagram, IcoMail, IcoPhone, IcoTikTok, IcoWhatsApp, handle } from '../components/icons'
import { AdSlot, Ago, FavButton, Grid, Loading, PriceTable, Seo, Verified, ListingCard } from '../components/ui'

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
    <form className="hsearch" onSubmit={submit} role="search">
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
  const prices = useAsync(() => api.prices({ days: 10 }).then((all) => {
    const FEATURED = ['name', 'yuca', 'otoe', 'platano', 'tomate', 'cebolla', 'papa', 'arroz', 'aji', 'zapallo', 'lechon', 'cerdo', 'ganado', 'novillo']
    const own = all.filter((p) => p.source !== 'IMA')
    const ima = all.filter((p) => p.source === 'IMA' && p.market === 'Merca Panamá' && FEATURED.some((f) => p.product_slug.startsWith(f)))
    return [...own, ...ima].slice(0, 8)
  }), [])
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
          <h1 className="hero__title">Compra, vende y conecta con el agro panameño</h1>
          <p className="hero__lead">Animales, productos agrícolas, insumos, maquinaria, servicios y fincas de todo Panamá. Contacta directo al productor.</p>
          <HeroSearch cats={roots} />
        </div>
      </section>

      <section className="wrap section">
        <div className="section__head"><h2>Categorías</h2></div>
        <div className="cats">
          {roots.map((c) => (
            <Link key={c.slug} to={`/c/${c.slug}`} className="card cat">
              <span className="cat__icon" aria-hidden="true">{ICONS[c.slug] || '🌾'}</span>
              <strong>{c.name}</strong>
            </Link>
          ))}
        </div>
      </section>

      <div className="wrap"><AdSlot placement="home_top" /></div>

      <section className="wrap section">
        <div className="section__head"><h2>Anuncios destacados</h2><Link className="more" to="/buscar">Ver directorio <IcoArrow /></Link></div>
        <p className="muted small note">Los destacados tienen mayor visibilidad y se identifican con la etiqueta «Destacado».</p>
        <Grid items={featured.data} empty="Aún no hay anuncios destacados." />
      </section>

      <section className="wrap section">
        <div className="section__head"><h2>Anuncios recientes</h2></div>
        <Grid items={recent.data} empty={<>Aún no hay anuncios. <Link to="/publicar">Publica el primero</Link>.</>} />
      </section>

      <section className="wrap section">
        <div className="section__head"><h2>Explorar por provincia</h2></div>
        <div className="provs">
          {PROVINCES.map((p) => (
            <Link key={p} to={`/buscar?prov=${encodeURIComponent(p)}`} className="prov">
              <span>{p}</span><span className="muted">{counts.data?.[p] || 0}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <div className="section__head"><h2>Precios de referencia</h2><Link className="more" to="/precios">Ver todos <IcoArrow /></Link></div>
        <PriceTable rows={prices.data} compact />
      </section>

      <section className="wrap section">
        <div className="section__head"><h2>Cómo funciona</h2></div>
        <div className="how">
          <div className="how__step"><span className="how__n">1</span><h3>Busca</h3><p>Filtra por categoría y provincia, o escribe lo que necesitas.</p></div>
          <div className="how__step"><span className="how__n">2</span><h3>Compara</h3><p>Revisa fotos, precio, ubicación y el perfil de cada productor.</p></div>
          <div className="how__step"><span className="how__n">3</span><h3>Contacta</h3><p>Escribe directo por WhatsApp o llama. Sin intermediarios.</p></div>
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

  return (
    <div className="wrap section">
      <Seo title={title} description={`${title}: anuncios de productores en Panamá con precio, ubicación y contacto por WhatsApp.`} />
      <nav className="crumbs"><Link to="/">Inicio</Link> / <Link to="/buscar">Directorio</Link>{catObj && <> / {catObj.name}</>}</nav>
      <h1 className="h1">{title}</h1>
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
      <div className="detail">
        <div>
          <div className="gallery__main" style={l.images?.[img] ? { backgroundImage: `url(${l.images[img]})` } : undefined}>
            {!l.images?.length && <span className="muted">Sin fotos</span>}
          </div>
          {l.images?.length > 1 && (
            <div className="gallery__thumbs">
              {l.images.map((src, i) => <button key={src + i} onClick={() => setImg(i)} className={i === img ? 'is-on' : ''} style={{ backgroundImage: `url(${src})` }} aria-label={`Foto ${i + 1}`} />)}
            </div>
          )}
          <h2 className="h2">Descripción</h2>
          <p className="prose">{l.description || 'Sin descripción.'}</p>
          <dl className="specs">
            <div><dt>Categoría</dt><dd>{l.category?.name}</dd></div>
            {l.breed && <div><dt>Raza / variedad</dt><dd>{l.breed}</dd></div>}
            {l.quantity && <div><dt>Disponibles</dt><dd>{l.quantity}</dd></div>}
            <div><dt>Ubicación</dt><dd>{[l.district, l.province].filter(Boolean).join(', ')}</dd></div>
            <div><dt>Publicado</dt><dd><Ago iso={l.created_at} /></dd></div>
            <div><dt>Visitas</dt><dd>{l.views}</dd></div>
          </dl>
          <AdSlot placement="anuncio_inferior" />
        </div>
        <aside className="buybox card">
          <div className="buybox__top">{l.featured ? <span className="tag tag--accent">Destacado</span> : <span />}<FavButton id={l.id} big /></div>
          <h1 className="buybox__title">{l.title}</h1>
          <p className="buybox__price">{money(l.price)} <span>/ {l.unit}</span></p>
          <a className="btn btn--wa btn--block" href={waLink(f.whatsapp, text)} target="_blank" rel="noopener" onClick={contact}><IcoWhatsApp size={22} /> Contactar por WhatsApp</a>
          {f.phone && <a className="btn btn--ghost btn--block" href={`tel:${f.phone}`} onClick={contact}><IcoPhone /> Llamar</a>}
          <Link to={`/finca/${f.slug}`} className="farmmini">
            {f.logo_url ? <img className="farmmini__avatar" src={f.logo_url} alt="" /> : <span className="farmmini__avatar">{(f.name || '?').slice(0, 1)}</span>}
            <span><strong>{f.name}</strong> {f.verified && <Verified />}<br /><span className="muted">{[f.district, f.province].filter(Boolean).join(', ')}</span></span>
            <IcoChevron className="ico farmmini__go" />
          </Link>
          <div className="safety">
            <strong>Compra segura:</strong> visita la finca o paga contra entrega. Nunca envíes dinero por adelantado a quien no conoces. <Link to="/seguridad">Más consejos</Link>
          </div>
          <button className="linkbtn" onClick={report} disabled={reported}>{reported ? 'Gracias, revisaremos el anuncio' : 'Reportar anuncio'}</button>
        </aside>
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
          <p className="eyebrow">{[f.district, f.province].filter(Boolean).join(', ')}</p>
          <h1 className="display display--md">{f.name}</h1>
          {f.verified && <span className="tag tag--light">✔ Finca verificada</span>}
        </div>
      </section>
      <div className="wrap section detail">
        <div>
          <h2 className="h2">Sobre la finca</h2>
          <p className="prose">{f.description || 'Esta finca aún no agregó una descripción.'}</p>
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
          {f.lat && <iframe title={`Mapa de ${f.name}`} className="map" loading="lazy" src={`https://www.google.com/maps?q=${f.lat},${f.lng}&z=13&output=embed`} />}
        </aside>
      </div>
    </>
  )
}

export function Farms() {
  const [prov, setProv] = useState('')
  const { data } = useAsync(() => api.farms({ province: prov }), [prov])
  return (
    <div className="wrap section">
      <Seo title="Directorio de fincas de Panamá" description="Fincas y productores agropecuarios de Panamá por provincia: porcinos, ganado, aves y cultivos." />
      <h1 className="h1">Directorio de fincas</h1>
      <select className="inline-select" value={prov} onChange={(e) => setProv(e.target.value)}>
        <option value="">Todas las provincias</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}
      </select>
      {!data ? <Loading /> : !data.length ? <p className="empty">Aún no hay fincas en esta provincia. <Link to="/publicar">Registra la tuya</Link>.</p> : (
        <div className="grid">
          {data.map((f) => (
            <Link key={f.id} to={`/finca/${f.slug}`} className="card lcard">
              <div className="lcard__img" style={f.cover_url ? { backgroundImage: `url(${f.cover_url})` } : undefined}>{!f.cover_url && <span className="lcard__noimg">{f.name}</span>}</div>
              <div className="lcard__body">
                <h3 className="lcard__title">{f.name} {f.verified && <Verified />}</h3>
                <p className="lcard__meta">{[f.district, f.province].filter(Boolean).join(', ')}</p>
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
  const rows = useMemo(() => (data || []).filter((p) => !q || norm(p.product_name).includes(norm(q))), [data, q])
  const last = (data || []).reduce((m, p) => (p.date > m ? p.date : m), '')
  return (
    <div className="wrap section">
      <Seo title="Precios agropecuarios del día en Panamá" description="Precios diarios de Merca Panamá, Mercado de San Felipe y otros mercados de Panamá (fuente IMA), más precios de lechones, ganado y productos del campo." />
      <h1 className="h1">Precios del día</h1>
      <p className="lead">Precios mayoristas oficiales del <a href="https://sipan.ima.gob.pa" target="_blank" rel="noopener">IMA (SIPAN)</a>, actualizados cada mañana, y precios reportados por productores. Los marcados como <span className="tag">Referencia</span> se calculan con los anuncios publicados y no son oficiales.</p>
      {markets.data?.length > 0 && (
        <div className="chips" role="tablist">
          {markets.data.map((m) => (
            <button key={m.market} role="tab" aria-selected={sel === m.market} className={`chip ${sel === m.market ? 'is-on' : ''}`} onClick={() => setMarket(m.market)}>{m.market}</button>
          ))}
          <button role="tab" aria-selected={sel === ''} className={`chip ${sel === '' ? 'is-on' : ''}`} onClick={() => setMarket('')}>Todos</button>
        </div>
      )}
      <div className="toolbar">
        <input placeholder="Buscar producto (ej. ñame, tomate, yuca)" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option><option value={90}>Últimos 90 días</option>
        </select>
      </div>
      {data && <p className="muted small">{rows.length} productos{last && ` · actualizado al ${last}`}</p>}
      <PriceTable rows={data ? rows : null} />
      <p className="muted small">¿Eres productor y conoces el precio de hoy en tu zona? <Link to="/panel/precio">Repórtalo desde tu panel</Link>.</p>
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
