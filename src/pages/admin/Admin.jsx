import { useState } from 'react'
import { BRAND } from '../../lib/config'
import { composeBrandImage, composePricesImage } from '../../lib/brandImage'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { NotifyCard } from '../../components/Notify'
import { useAsync } from '../../lib/useAsync'
import { AD_PLACEMENTS, PROVINCES, UNITS, money } from '../../lib/config'
import { Ago, Field, Loading, Seo } from '../../components/ui'

export default function Admin() {
  const { user, loading } = useAuth()
  if (loading) return <div className="wrap section"><Loading /></div>
  if (!user) return <Navigate to="/entrar" replace />
  if (user.role !== 'admin') return <div className="wrap section narrow"><h1 className="h1">Sin acceso</h1><p>Esta sección es solo para administradores.</p></div>
  return (
    <div className="wrap section">
      <Seo title="Administración" />
      <div className="panel-head"><h1 className="h1">Administración</h1><button className="btn btn--ghost btn--sm" onClick={() => api.signOut()}>Salir</button></div>
      <nav className="subnav">
        <NavLink end to="/admin">Resumen</NavLink>
        <NavLink to="/admin/anuncios">Anuncios</NavLink>
        <NavLink to="/admin/usuarios">Usuarios</NavLink>
        <NavLink to="/admin/fincas">Fincas</NavLink>
        <NavLink to="/admin/precios">Precios</NavLink>
        <NavLink to="/admin/marca">Publicar en redes</NavLink>
        <NavLink to="/admin/redes">Cola de anuncios</NavLink>
        <NavLink to="/admin/comentarios">Comentarios</NavLink>
        <NavLink to="/admin/publicidad">Publicidad</NavLink>
        <NavLink to="/admin/reportes">Reportes</NavLink>
      </nav>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="anuncios" element={<Listings />} />
        <Route path="usuarios" element={<Users />} />
        <Route path="fincas" element={<Farms />} />
        <Route path="precios" element={<Prices />} />
        <Route path="marca" element={<BrandPosts />} />
        <Route path="redes" element={<Social />} />
        <Route path="comentarios" element={<Comments />} />
        <Route path="publicidad" element={<Ads />} />
        <Route path="reportes" element={<Reports />} />
      </Routes>
    </div>
  )
}

function Overview() {
  const { user } = useAuth()
  const { data: s } = useAsync(() => api.admin.stats(), [])
  if (!s) return <Loading />
  const K = ({ label, value, to, warn }) => (
    <Link to={to || '#'} className={`kpi ${warn ? 'kpi--warn' : ''}`}><span>{label}</span><strong>{value}</strong></Link>
  )
  return (
    <>
      <NotifyCard user={user} admin />
      <div className="kpis kpis--4">
        <K label="Usuarios" value={s.users} to="/admin/usuarios" />
        <K label="Fincas (verificadas)" value={`${s.farms} (${s.verified})`} to="/admin/fincas" />
        <K label="Anuncios publicados" value={s.approved} to="/admin/anuncios" />
        <K label="Pendientes de revisión" value={s.pending} to="/admin/anuncios" warn={s.pending > 0} />
        <K label="Visitas a anuncios" value={s.views} />
        <K label="Contactos por WhatsApp" value={s.contacts} />
        <K label="Posts en redes" value={s.posts} to="/admin/redes" />
        <K label="Comentarios sin responder" value={`${s.unanswered} de ${s.comments}`} to="/admin/comentarios" warn={s.unanswered > 0} />
        <K label="Reportes abiertos" value={s.reports} to="/admin/reportes" warn={s.reports > 0} />
      </div>
      <p className="muted small">Contactos = clics en WhatsApp o Llamar desde un anuncio. Es la métrica que demuestra al productor que la plataforma le trae clientes.</p>
    </>
  )
}

const ST = ['pendiente', 'aprobado', 'rechazado', 'vendido', 'vencido']
// Prepara la imagen con el marco de FincaYa para redes (si falla, se usa la foto original)
async function socialImageFor(user, l) {
  if (!l.images?.[0]) return undefined
  try { return await api.uploadImage(user, await composeBrandImage(l.images[0])) } catch { return undefined }
}

function Listings() {
  const { user } = useAuth()
  const [status, setStatus] = useState('pendiente')
  const [busyId, setBusyId] = useState(null)
  const { data, reload } = useAsync(() => api.admin.listings(status), [status])
  const act = async (l, patch) => {
    if (busyId) return
    setBusyId(l.id)
    try {
      const socialImage = patch.status === 'aprobado' ? await socialImageFor(user, l) : undefined
      await api.admin.setListing(l.id, patch, { socialImage }); reload()
    } finally { setBusyId(null) }
  }
  return (
    <>
      <div className="chips">{ST.map((s) => <button key={s} className={`chip ${status === s ? 'is-on' : ''}`} onClick={() => setStatus(s)}>{s}</button>)}</div>
      {!data ? <Loading /> : !data.length ? <p className="empty">No hay anuncios en "{status}".</p> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th></th><th>Anuncio</th><th>Finca</th><th>Precio</th><th>Métricas</th><th>Acciones</th></tr></thead>
          <tbody>{data.map((l) => (
            <tr key={l.id}>
              <td><div className="mini" style={l.images?.[0] ? { backgroundImage: `url(${l.images[0]})` } : undefined} /></td>
              <td><Link to={`/anuncio/${l.slug}`}>{l.title}</Link><br /><span className="muted small">{l.category?.name} · {l.province} · <Ago iso={l.created_at} /></span><br /><span className="muted small clamp">{l.description}</span></td>
              <td>{l.farm?.name}{l.farm?.verified ? ' ✔' : ''}</td>
              <td className="num">{money(l.price)}<br /><span className="muted">/{l.unit}</span></td>
              <td className="num small">{l.views} visitas<br />{l.contacts} contactos</td>
              <td className="actions">
                {l.status !== 'aprobado' && <button className="btn btn--fill btn--xs" disabled={!!busyId} onClick={() => act(l, { status: 'aprobado', reject_reason: null })}>{busyId === l.id ? 'Publicando… (hasta 30 s)' : 'Aprobar y publicar'}</button>}
                {l.status !== 'rechazado' && <button className="btn btn--ghost btn--xs" disabled={!!busyId} onClick={() => { const r = prompt('Motivo del rechazo (lo verá el productor):'); if (r) act(l, { status: 'rechazado', reject_reason: r }) }}>Rechazar</button>}
                <button className="btn btn--ghost btn--xs" disabled={!!busyId} onClick={() => act(l, { featured: !l.featured })}>{l.featured ? 'Quitar destacado' : 'Destacar'}</button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  )
}

function Users() {
  const { data, reload } = useAsync(() => api.admin.users(), [])
  if (!data) return <Loading />
  return (
    <div className="table-wrap"><table className="table">
      <thead><tr><th>Usuario</th><th>Rol</th><th>Alta</th><th>Acciones</th></tr></thead>
      <tbody>{data.map((u) => (
        <tr key={u.id}>
          <td><strong>{u.full_name || '—'}</strong><br /><span className="muted small">{u.email || u.id} {u.whatsapp ? `· ${u.whatsapp}` : ''}</span></td>
          <td><select value={u.role} onChange={(e) => api.admin.setUser(u.id, { role: e.target.value }).then(reload)}><option>productor</option><option>admin</option></select></td>
          <td><Ago iso={u.created_at} /></td>
          <td><button className={`btn btn--xs ${u.blocked ? 'btn--fill' : 'btn--ghost'}`} onClick={() => api.admin.setUser(u.id, { blocked: !u.blocked }).then(reload)}>{u.blocked ? 'Desbloquear' : 'Bloquear'}</button></td>
        </tr>
      ))}</tbody>
    </table></div>
  )
}

function Farms() {
  const { data, reload } = useAsync(() => api.admin.farms(), [])
  if (!data) return <Loading />
  return (
    <div className="table-wrap"><table className="table">
      <thead><tr><th>Finca</th><th>Ubicación</th><th>Contacto</th><th>Verificación</th></tr></thead>
      <tbody>{data.map((f) => (
        <tr key={f.id}>
          <td><Link to={`/finca/${f.slug}`}>{f.name}</Link></td>
          <td>{[f.district, f.province].filter(Boolean).join(', ')}</td>
          <td className="small">{f.whatsapp}<br />{f.email}</td>
          <td><button className={`btn btn--xs ${f.verified ? 'btn--fill' : 'btn--ghost'}`} onClick={() => api.admin.setFarm(f.id, { verified: !f.verified }).then(reload)}>{f.verified ? '✔ Verificada' : 'Marcar verificada'}</button></td>
        </tr>
      ))}</tbody>
    </table></div>
  )
}

function Prices() {
  const { data, reload } = useAsync(() => api.admin.prices(), [])
  const empty = { product_name: '', unit: 'libra', price: '', province: '', market: '', source: 'Reporte de productores', source_url: '', date: new Date().toISOString().slice(0, 10) }
  const [f, setF] = useState(empty)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const pending = (data || []).filter((p) => !p.approved)
  return (
    <>
      <ImaSync onDone={reload} />
      <div className="card form-card">
        <p className="filters__h">Cargar precio</p>
        <form className="form form--3" onSubmit={async (e) => {
          e.preventDefault()
          await api.admin.savePrice({ ...f, product_slug: f.product_name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-'), price: Number(f.price), province: f.province || null, is_reference: false })
          setF(empty); reload()
        }}>
          <Field label="Producto"><input required value={f.product_name} onChange={set('product_name')} /></Field>
          <Field label="Precio B/."><input required type="number" step="0.01" value={f.price} onChange={set('price')} /></Field>
          <Field label="Unidad"><select value={f.unit} onChange={set('unit')}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></Field>
          <Field label="Provincia"><select value={f.province} onChange={set('province')}><option value="">Nacional</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Mercado / lugar"><input value={f.market} onChange={set('market')} /></Field>
          <Field label="Fuente"><select value={f.source} onChange={set('source')}><option>Reporte de productores</option><option>INEC</option><option>Acodeco</option><option>Subasta ganadera</option><option>MIDA</option></select></Field>
          <Field label="Enlace de la fuente"><input value={f.source_url} onChange={set('source_url')} placeholder="https://" /></Field>
          <Field label="Fecha"><input type="date" value={f.date} onChange={set('date')} /></Field>
          <div className="form__actions"><button className="btn btn--fill">Guardar precio</button></div>
        </form>
      </div>
      {pending.length > 0 && <>
        <h2 className="h2">Reportes de productores por aprobar ({pending.length})</h2>
        <PriceRows rows={pending} reload={reload} approve />
      </>}
      <h2 className="h2">Últimos precios</h2>
      {!data ? <Loading /> : <PriceRows rows={data.filter((p) => p.approved).slice(0, 60)} reload={reload} />}
    </>
  )
}
function ImaSync({ onDone }) {
  const log = useAsync(() => api.admin.syncLog(), [])
  const [days, setDays] = useState(2)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const run = async () => {
    setBusy(true); setMsg('')
    try {
      const r = await api.admin.syncIma(days)
      setMsg(r.ok ? `✅ ${r.upserted} precios actualizados (${r.days} días).` : `Error: ${r.error}`)
      log.reload(); onDone?.()
    } catch (e) { setMsg(`Error: ${e.message || e}`) } finally { setBusy(false) }
  }
  const last = log.data?.[0]
  return (
    <div className="card form-card">
      <p className="filters__h">Precios oficiales del IMA (SIPAN)</p>
      <p className="muted small">Se actualizan solos todos los días a las 7:15 a. m. y 12:15 p. m. (Merca Panamá, San Felipe, Marisco y mercados regionales cuando publican).
        {last && <> Última sincronización: <strong>{new Date(last.ran_at).toLocaleString('es-PA')}</strong> · {last.upserted} precios.</>}</p>
      <div className="toolbar">
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} disabled={busy}>
          <option value={2}>Hoy y ayer</option><option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option><option value={45}>Últimos 45 días (historial)</option>
        </select>
        <button className="btn btn--fill" onClick={run} disabled={busy}>{busy ? 'Sincronizando… (hasta 1 min)' : 'Sincronizar ahora'}</button>
      </div>
      {msg && <p className="notice">{msg}</p>}
    </div>
  )
}

const PriceRows = ({ rows, reload, approve }) => (
  <div className="table-wrap"><table className="table">
    <thead><tr><th>Fecha</th><th>Producto</th><th>Precio</th><th>Fuente</th><th></th></tr></thead>
    <tbody>{rows.map((p) => (
      <tr key={p.id}>
        <td className="muted">{p.date}</td>
        <td>{p.product_name}<br /><span className="muted small">{[p.province, p.market].filter(Boolean).join(' · ')}</span></td>
        <td className="num">{money(p.price)} / {p.unit}</td>
        <td>{p.source}{p.is_reference ? ' (ref.)' : ''}</td>
        <td className="actions">
          {approve && <button className="btn btn--fill btn--xs" onClick={() => api.admin.savePrice({ id: p.id, approved: true }).then(reload)}>Aprobar</button>}
          <button className="linkbtn down" onClick={() => api.admin.deletePrice(p.id).then(reload)}>Borrar</button>
        </td>
      </tr>
    ))}</tbody>
  </table></div>
)

function Social() {
  const { user } = useAuth()
  const [busyId, setBusyId] = useState(null)
  const { data, reload } = useAsync(() => api.admin.social(), [])
  const publishNow = async (p) => {
    if (busyId) return
    setBusyId(p.listing_id)
    try {
      const full = (await api.admin.listings('aprobado')).find((l) => l.id === p.listing_id)
      await api.admin.publishNow(p.listing_id, full ? await socialImageFor(user, full) : undefined); reload()
    } finally { setBusyId(null) }
  }
  if (!data) return <Loading />
  return (
    <>
      <p className="muted">Al aprobar un anuncio se crea la publicación en Facebook e Instagram de la plataforma. Mientras Meta aprueba los permisos, quedan "pendientes" y se publican con el botón.</p>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Anuncio</th><th>Red</th><th>Estado</th><th></th></tr></thead>
        <tbody>{data.map((p) => (
          <tr key={p.id}>
            <td><Link to={`/anuncio/${p.listing?.slug}`}>{p.listing?.title}</Link><br /><Ago iso={p.created_at} /></td>
            <td><span className={`net net--${p.network}`}>{p.network}</span></td>
            <td><span className={`status status--${p.status === 'publicado' ? 'aprobado' : p.status === 'error' ? 'rechazado' : 'pendiente'}`}>{p.status}</span>{p.error && <><br /><span className="down small">{p.error}</span></>}</td>
            <td>{p.status !== 'publicado' ? <button className="btn btn--fill btn--xs" disabled={!!busyId} onClick={() => publishNow(p)}>{busyId === p.listing_id ? 'Publicando…' : 'Publicar ahora'}</button> : p.permalink && <a href={p.permalink} target="_blank" rel="noopener">Ver post</a>}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </>
  )
}

const SITE = BRAND.url
const TEMPLATES = [
  { name: 'Bienvenida', text: `🌾 ¡Bienvenidos a FincaYa Panamá!

El nuevo punto de encuentro del agro panameño: compra, vende y conecta con productores de todo el país.

🐄 Ganadería · 🐖 Porcicultura · 🐓 Avicultura · 🌱 Agricultura · 🚜 Maquinaria · 🩺 Servicios

Busca por provincia y contacta directo al productor por WhatsApp, sin intermediarios.

👉 ${SITE}

#FincaYaPanamá #AgroPanamá #ProductoresPanameños #DirectorioAgropecuario` },
  { name: 'Convocatoria de productores', text: `📢 ¿Tienes una finca o produces en el campo panameño?

Publica tu anuncio en FincaYa Panamá y conecta con compradores de todo el país.

✅ Gratis durante el lanzamiento
✅ Tu perfil de finca con fotos, ubicación y WhatsApp
✅ Tus anuncios también se comparten en nuestras redes

Regístrate en 5 minutos 👉 ${SITE}/publicar

#FincaYaPanamá #ProductoresPanameños #AgroPanamá` },
  { name: 'Cómo publicar', text: `📲 Publicar en FincaYa Panamá es así de fácil:

1️⃣ Crea tu cuenta con tu correo y WhatsApp
2️⃣ Registra tu finca o negocio
3️⃣ Sube fotos reales, precio y cantidad
4️⃣ Recibe a los compradores directo en tu WhatsApp

Revisamos cada anuncio para que la plataforma sea confiable.

👉 ${SITE}/publicar

#FincaYaPanamá #AgroPanamá` },
  { name: 'Compra segura', text: `🛡️ Consejos para comprar seguro en el agro:

• Visita la finca o pide videollamada antes de pagar
• No envíes adelantos a quien no conoces
• Pide registro de vacunas y guía de movilización
• Compara con los precios de referencia en ${SITE}/precios

¿Ves algo sospechoso? Usa «Reportar anuncio».

#FincaYaPanamá #CompraSegura #AgroPanamá` },
]

function BrandPosts() {
  const { user } = useAuth()
  const hist = useAsync(() => api.admin.brandPosts(), [])
  const [text, setText] = useState(TEMPLATES[0].text)
  const [img, setImg] = useState('')
  const [useFrame, setUseFrame] = useState(true)
  const [nets, setNets] = useState({ facebook: true, instagram: true })
  const [busy, setBusy] = useState(false)
  const [up, setUp] = useState(false)
  const [res, setRes] = useState(null)
  const networks = Object.keys(nets).filter((k) => nets[k])
  const upload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setUp(true)
    try { setImg(await api.uploadImage(user, useFrame ? await composeBrandImage(f) : f)) }
    catch (err) { alert(err.message || 'No se pudo preparar la imagen') }
    finally { setUp(false); e.target.value = '' }
  }
  const [mk, setMk] = useState(false)
  // Arma la publicación diaria de precios: imagen con la tabla + texto con alzas y bajas
  const makePrices = async () => {
    setMk(true)
    try {
      const all = await api.prices({ days: 10, market: 'Merca Panamá' })
      const day = all.reduce((m, p) => (p.date > m ? p.date : m), '')
      const today = all.filter((p) => p.date === day && p.source === 'IMA')
      if (!today.length) throw new Error('Aún no hay precios del IMA para hoy. Sincroniza en Admin → Precios.')
      const ups = today.filter((p) => p.change > 0).sort((a, b) => b.change - a.change)
      const downs = today.filter((p) => p.change < 0).sort((a, b) => a.change - b.change)
      const KEY = ['name', 'yuca', 'otoe', 'platano', 'tomate', 'cebolla', 'papa', 'arroz-pilado']
      const featured = today.filter((p) => KEY.some((k) => p.product_slug.startsWith(k)))
      const pick = [...ups.slice(0, 4), ...downs.slice(0, 4)]
      for (const f of featured) if (pick.length < 8 && !pick.includes(f)) pick.push(f)
      const [y, m, d] = day.split('-').map(Number)
      const fecha = `${d} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][m - 1]}`
      const file = await composePricesImage(pick, { title: 'Precios de hoy', subtitle: `Merca Panamá · ${fecha} de ${y}` })
      const url = await api.uploadImage(user, file)
      const line = (p) => `• ${p.product_name}: B/. ${Number(p.price).toFixed(2)} / ${p.unit} (${p.change > 0 ? '▲' : '▼'} ${(Math.abs(p.change) * 100).toFixed(1)}%)`
      setImg(url)
      setText([
        `📊 Precios de hoy en Merca Panamá · ${fecha}`,
        ups.length ? `\n🔺 Suben:\n${ups.slice(0, 4).map(line).join('\n')}` : '',
        downs.length ? `\n🔻 Bajan:\n${downs.slice(0, 4).map(line).join('\n')}` : '',
        `\n👉 Los ${today.length} precios del día, con historial: ${BRAND.url}/precios`,
        `📲 ¿Vendes ñame, yuca, plátano, ganado o cerdos? Publica gratis en ${BRAND.url}/publicar`,
        `\nFuente: IMA (Instituto de Mercadeo Agropecuario).`,
        `#PreciosDelDía #MercaPanamá #AgroPanamá #FincaYaPanamá #ProductoresPanameños #Panamá`,
      ].filter(Boolean).join('\n'))
    } catch (err) { alert(err.message || String(err)) } finally { setMk(false) }
  }
  const publish = async () => {
    if (busy || !confirm(`Se publicará ahora en: ${networks.join(' y ')}. ¿Continuar?`)) return
    setBusy(true); setRes(null)
    try { setRes((await api.admin.publishBrand({ message: text, image_url: img || null, networks })).results) ; hist.reload() }
    catch (err) { setRes({ error: err.message || String(err) }) } finally { setBusy(false) }
  }
  return (
    <>
      <p className="muted">Publica en el Facebook e Instagram de {BRAND.name}: bienvenidas, convocatorias, consejos. Instagram requiere imagen (se convierte a JPG automáticamente; ideal 1080×1350).</p>
      <div className="chips">
        <button className="chip is-on" onClick={makePrices} disabled={mk}>{mk ? 'Armando…' : '📊 Precios del día (automático)'}</button>
        {TEMPLATES.map((t) => <button key={t.name} className="chip" onClick={() => setText(t.text)}>{t.name}</button>)}
      </div>
      <p className="muted small">Consejo: publica los precios del día todas las mañanas después de las 7:30 a. m. Es el contenido que más se comparte en grupos de productores.</p>
      <div className="brand-grid">
        <div className="card form-card form">
          <Field label={`Texto (${text.length}/2200)`}><textarea rows="14" maxLength={2200} value={text} onChange={(e) => setText(e.target.value)} /></Field>
          <label className="check"><input type="checkbox" checked={useFrame} onChange={(e) => setUseFrame(e.target.checked)} /> Usar el marco de FincaYa Panamá (se aplica al subir la foto)</label>
          <Field label="Imagen" hint="Foto real del agro. Con el marco queda cuadrada 1080×1080."><input type="file" accept="image/*" onChange={upload} disabled={up} /></Field>
          <div className="chips">
            {['facebook', 'instagram'].map((n) => (
              <label key={n} className="check"><input type="checkbox" checked={nets[n]} onChange={(e) => setNets({ ...nets, [n]: e.target.checked })} /> {n === 'facebook' ? 'Facebook' : 'Instagram'}</label>
            ))}
          </div>
          <button className="btn btn--fill" disabled={busy || up || !text.trim() || !networks.length} onClick={publish}>{busy ? 'Publicando…' : up ? 'Subiendo imagen…' : 'Publicar ahora'}</button>
          {res && <div className="notice">{Object.entries(res).map(([k, v]) => <p key={k} style={{ margin: 0 }}><strong>{k}:</strong> {String(v)}</p>)}</div>}
        </div>
        <div className="card preview">
          <p className="muted small">Vista previa</p>
          <div className="preview__head"><img src="/apple-touch-icon.png" alt="" width="36" height="36" /><strong>{BRAND.name}</strong></div>
          {img ? <img className="preview__img" src={img} alt="" /> : <div className="preview__img preview__img--empty">Sin imagen</div>}
          <p className="preview__text">{text}</p>
        </div>
      </div>
      <h2 className="h2">Historial</h2>
      {!hist.data ? <Loading /> : !hist.data.length ? <p className="empty">Aún no hay publicaciones de marca.</p> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Publicación</th><th>Redes</th><th>Resultado</th></tr></thead>
          <tbody>{hist.data.map((b) => (
            <tr key={b.id}>
              <td><span className="clamp">{b.message}</span><br /><Ago iso={b.created_at} /></td>
              <td>{(b.networks || []).map((n) => <span key={n} className={`net net--${n}`} style={{ marginRight: 4 }}>{n}</span>)}</td>
              <td className="small">{Object.entries(b.results || {}).map(([k, v]) => <div key={k}>{k}: {String(v).startsWith('publicado') ? '✅ ' : '⚠️ '}{String(v).replace(/^publicado ?/, '')}</div>)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  )
}

function Comments() {
  const { data } = useAsync(() => api.admin.comments(), [])
  if (!data) return <Loading />
  return (
    <div className="table-wrap"><table className="table">
      <thead><tr><th>Comentario</th><th>Anuncio</th><th>Estado</th></tr></thead>
      <tbody>{data.map((c) => (
        <tr key={c.id}>
          <td><span className={`net net--${c.network}`}>{c.network}</span> <strong>{c.author_name}</strong>: {c.message}<br /><Ago iso={c.created_at} /></td>
          <td><Link to={`/anuncio/${c.listing?.slug}`}>{c.listing?.title}</Link></td>
          <td>{c.reply ? <span className="status status--aprobado">Respondido</span> : <span className="status status--pendiente">Sin responder</span>}</td>
        </tr>
      ))}</tbody>
    </table></div>
  )
}

function Ads() {
  const { data, reload } = useAsync(() => api.admin.ads(), [])
  const empty = { placement: 'home_top', advertiser: '', image_url: '', link_url: '', ends_at: '', active: true }
  const [f, setF] = useState(empty)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (
    <>
      <div className="card form-card">
        <p className="filters__h">Nuevo espacio publicitario</p>
        <form className="form form--3" onSubmit={async (e) => { e.preventDefault(); await api.admin.saveAd({ ...f, ends_at: f.ends_at || null }); setF(empty); reload() }}>
          <Field label="Ubicación"><select value={f.placement} onChange={set('placement')}>{Object.entries(AD_PLACEMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Anunciante"><input required value={f.advertiser} onChange={set('advertiser')} /></Field>
          <Field label="Imagen (URL)" hint="Banner horizontal, 1200×200"><input value={f.image_url} onChange={set('image_url')} /></Field>
          <Field label="Enlace"><input value={f.link_url} onChange={set('link_url')} /></Field>
          <Field label="Termina"><input type="date" value={f.ends_at} onChange={set('ends_at')} /></Field>
          <div className="form__actions"><button className="btn btn--fill">Guardar</button></div>
        </form>
      </div>
      {!data ? <Loading /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Anunciante</th><th>Ubicación</th><th>Impresiones / clics</th><th>Activo</th></tr></thead>
          <tbody>{data.map((a) => (
            <tr key={a.id}>
              <td>{a.advertiser}</td><td>{AD_PLACEMENTS[a.placement]}</td><td className="num">{a.impressions} / {a.clicks}</td>
              <td><button className={`btn btn--xs ${a.active ? 'btn--fill' : 'btn--ghost'}`} onClick={() => api.admin.saveAd({ id: a.id, active: !a.active }).then(reload)}>{a.active ? 'Activo' : 'Inactivo'}</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  )
}

function Reports() {
  const { data, reload } = useAsync(() => api.admin.reports(), [])
  if (!data) return <Loading />
  if (!data.length) return <p className="empty">No hay reportes.</p>
  return (
    <div className="table-wrap"><table className="table">
      <thead><tr><th>Anuncio</th><th>Motivo</th><th>Estado</th><th></th></tr></thead>
      <tbody>{data.map((r) => (
        <tr key={r.id}>
          <td><Link to={`/anuncio/${r.listing?.slug}`}>{r.listing?.title}</Link><br /><Ago iso={r.created_at} /></td>
          <td>{r.reason}{r.details && <><br /><span className="muted small">{r.details}</span></>}</td>
          <td><span className={`status status--${r.status === 'abierto' ? 'pendiente' : 'aprobado'}`}>{r.status}</span></td>
          <td>{r.status === 'abierto' && <button className="btn btn--ghost btn--xs" onClick={() => api.admin.resolveReport(r.id).then(reload)}>Marcar resuelto</button>}</td>
        </tr>
      ))}</tbody>
    </table></div>
  )
}
