import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { BRAND, money, waLink, timeAgo } from '../lib/config'
import { api, DEMO } from '../lib/api'
import { useAuth } from '../lib/auth'

// ---------- SEO en el navegador (los bots reciben HTML desde /api/seo) ----------
export function Seo({ title, description, jsonld }) {
  useEffect(() => {
    document.title = title ? `${title} | ${BRAND.name}` : `${BRAND.name} | Todo el agro, en un solo lugar`
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    let s = document.getElementById('jsonld')
    if (jsonld) {
      if (!s) { s = document.createElement('script'); s.type = 'application/ld+json'; s.id = 'jsonld'; document.head.appendChild(s) }
      s.textContent = JSON.stringify(jsonld)
    } else if (s) s.remove()
  }, [title, description, jsonld])
  return null
}

// ---------- Layout ----------
export function Header() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const submit = (e) => { e.preventDefault(); nav(`/buscar?q=${encodeURIComponent(q)}`); setOpen(false) }
  return (
    <header className="hdr">
      {DEMO && <div className="demo-bar">Modo demo: datos de ejemplo guardados solo en este navegador. Conecta Supabase para producción.</div>}
      <div className="hdr__in">
        <Link to="/" className="brand" aria-label={`${BRAND.name}, inicio`}>
          <img src="/logo.png" alt={BRAND.name} width="720" height="213" />
        </Link>
        <form className="hdr__search" onSubmit={submit} role="search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="¿Qué estás buscando?" aria-label="Buscar" />
          <button className="btn btn--fill btn--sm">Buscar</button>
        </form>
        <button className="hdr__burger" onClick={() => setOpen(!open)} aria-label="Menú" aria-expanded={open}>☰</button>
        <nav className={`hdr__nav ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)}>
          <NavLink to="/buscar">Directorio</NavLink>
          <NavLink to="/fincas">Fincas</NavLink>
          <NavLink to="/precios">Precios del día</NavLink>
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          {user ? <NavLink to="/panel">Mi panel</NavLink> : <NavLink to="/entrar">Entrar</NavLink>}
          <Link to="/publicar" className="btn btn--fill btn--sm">Publicar anuncio</Link>
        </nav>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="ftr">
      <div className="wrap ftr__grid">
        <div>
          <img className="ftr__logo" src="/logo.png" alt={BRAND.name} width="720" height="213" loading="lazy" />
          <p className="muted">{BRAND.tagline} Compra, vende y conecta con el agro panameño.</p>
          <p className="ftr__social">
            <a href={`https://instagram.com/${BRAND.instagram}`} target="_blank" rel="noopener">Instagram</a>
            <a href={`https://facebook.com/${BRAND.facebook}`} target="_blank" rel="noopener">Facebook</a>
            <a href={`https://tiktok.com/@${BRAND.tiktok}`} target="_blank" rel="noopener">TikTok</a>
          </p>
        </div>
        <div>
          <p className="ftr__h">Explora</p>
          <Link to="/c/ganaderia">Ganadería</Link><Link to="/c/porcicultura">Porcicultura</Link>
          <Link to="/c/agricultura">Agricultura</Link><Link to="/c/insumos">Insumos</Link>
          <Link to="/c/maquinaria">Maquinaria y equipos</Link><Link to="/c/servicios">Servicios</Link>
        </div>
        <div>
          <p className="ftr__h">Plataforma</p>
          <Link to="/precios">Precios del día</Link><Link to="/fincas">Directorio de fincas</Link>
          <Link to="/seguridad">Ayuda y compra segura</Link>
          <Link to="/privacidad">Términos y privacidad</Link>
          <a href={waLink(BRAND.whatsapp, `Hola ${BRAND.name}`)} target="_blank" rel="noopener">Soporte por WhatsApp</a>
        </div>
      </div>
      <p className="wrap muted ftr__copy">© {new Date().getFullYear()} {BRAND.name}. Los anuncios son responsabilidad de quien los publica. Los precios publicados son de referencia.</p>
    </footer>
  )
}

// ---------- Tarjetas y piezas ----------
export function FavButton({ id, big }) {
  const { favs, toggleFav } = useAuth()
  const on = favs.includes(id)
  return (
    <button type="button" className={`fav ${on ? 'is-on' : ''} ${big ? 'fav--big' : ''}`} aria-pressed={on}
      aria-label={on ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFav(id) }}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.2 3.4 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 6 3.7 4.5 7.3C19.5 16.4 12 21 12 21z" /></svg>
    </button>
  )
}

export function ListingCard({ l }) {
  const img = l.images?.[0]
  return (
    <Link to={`/anuncio/${l.slug}`} className="card lcard">
      <div className="lcard__img" style={img ? { backgroundImage: `url(${img})` } : undefined} role={img ? 'img' : undefined} aria-label={img ? l.title : undefined}>
        {!img && <span className="lcard__noimg">{l.category?.name || 'Sin foto'}</span>}
        {l.featured && <span className="tag tag--accent lcard__flag">Destacado</span>}
        <FavButton id={l.id} />
      </div>
      <div className="lcard__body">
        <p className="lcard__cat">{l.category?.name}{l.breed ? ` · ${l.breed}` : ''}</p>
        <h3 className="lcard__title">{l.title}</h3>
        <p className="lcard__price">{money(l.price)}<span> / {l.unit}</span></p>
        <p className="lcard__meta">
          {l.farm?.name}{l.farm?.verified && <Verified />} · {l.district ? `${l.district}, ` : ''}{l.province}
        </p>
        <span className="lcard__cta">Ver detalles</span>
      </div>
    </Link>
  )
}

export const Verified = () => <span className="verified" title="Finca verificada">✔ Verificada</span>

export function Grid({ items, empty = 'No hay anuncios con esos filtros todavía.' }) {
  if (!items) return <Loading />
  if (!items.length) return <p className="empty">{empty}</p>
  return <div className="grid">{items.map((l) => <ListingCard key={l.id} l={l} />)}</div>
}

export const Loading = () => <p className="muted loading">Cargando…</p>

export function Sparkline({ values, w = 120, h = 32 }) {
  if (!values?.length) return null
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 6)}`).join(' ')
  const up = values.at(-1) >= values[0]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="spark" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={up ? 'var(--green)' : 'var(--red)'} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

// Agrupa precios por producto: último valor, variación y serie
export function summarizePrices(rows) {
  const by = {}
  for (const p of rows || []) {
    const k = `${p.product_slug}|${p.unit}|${p.province || ''}|${p.source}`
    ;(by[k] ||= { ...p, series: [] }).series.push(p)
  }
  return Object.values(by).map((g) => {
    const s = g.series.sort((a, b) => a.date.localeCompare(b.date))
    const last = s.at(-1), prev = s.at(-2)
    return { ...last, values: s.map((x) => Number(x.price)), change: prev ? (last.price - prev.price) / prev.price : 0 }
  }).sort((a, b) => a.product_name.localeCompare(b.product_name))
}

export function PriceTable({ rows, compact }) {
  const list = summarizePrices(rows)
  if (!rows) return <Loading />
  if (!list.length) return <p className="empty">Aún no hay precios cargados.</p>
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Producto</th><th>Precio</th><th>Variación</th>{!compact && <th>Tendencia</th>}<th>Fuente</th><th>Fecha</th></tr></thead>
        <tbody>
          {list.map((p) => (
            <tr key={`${p.product_slug}${p.unit}${p.province}${p.source}`}>
              <td><strong>{p.product_name}</strong><br /><span className="muted">{[p.province, p.market].filter(Boolean).join(' · ') || 'Nacional'}</span></td>
              <td className="num">{money(p.price)}<br /><span className="muted">por {p.unit}</span></td>
              <td className={`num ${p.change > 0 ? 'up' : p.change < 0 ? 'down' : ''}`}>{p.change > 0 ? '▲' : p.change < 0 ? '▼' : '='} {(Math.abs(p.change) * 100).toFixed(1)}%</td>
              {!compact && <td><Sparkline values={p.values} /></td>}
              <td>{p.source}{p.is_reference && <><br /><span className="tag">Referencia</span></>}</td>
              <td className="muted">{p.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AdSlot({ placement }) {
  const [ad, setAd] = useState(null)
  useEffect(() => { api.ads(placement).then((a) => setAd(a?.[0] || null)).catch(() => {}) }, [placement])
  if (!ad) return null
  if (!ad.image_url) return (
    <div className="adslot adslot--empty"><span className="muted">Publicidad</span><p>¿Quieres anunciar tu marca aquí? <a href={waLink(BRAND.whatsapp, 'Quiero anunciar en ' + BRAND.name)} target="_blank" rel="noopener">Escríbenos</a></p></div>
  )
  return (
    <a className="adslot" href={ad.link_url} target="_blank" rel="noopener sponsored">
      <span className="muted">Publicidad · {ad.advertiser}</span>
      <img src={ad.image_url} alt={ad.advertiser} />
    </a>
  )
}

export const Ago = ({ iso }) => <span className="muted">{timeAgo(iso)}</span>

export function Field({ label, children, hint }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small className="muted">{hint}</small>}</label>
}
