import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { api, DEMO } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useAsync } from '../lib/useAsync'
import { PROVINCES, UNITS, money } from '../lib/config'
import { Ago, Field, Grid, Loading, Seo } from '../components/ui'

// ================================ LOGIN / REGISTRO ================================
export function Login() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState('entrar')
  const [f, setF] = useState({ email: '', password: '', full_name: '', phone: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/panel'} replace />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    try {
      if (mode === 'entrar') await api.signIn(f.email, f.password)
      else { await api.signUp(f); if (!DEMO) setMsg('Revisa tu correo para confirmar la cuenta y luego entra.') }
    } catch (err) { setMsg(err.message || 'No se pudo completar.') } finally { setBusy(false) }
  }
  return (
    <div className="wrap section narrow">
      <Seo title={mode === 'entrar' ? 'Entrar' : 'Crear cuenta'} />
      <div className="card form-card">
        <div className="tabs">
          <button className={mode === 'entrar' ? 'is-on' : ''} onClick={() => setMode('entrar')}>Entrar</button>
          <button className={mode === 'registro' ? 'is-on' : ''} onClick={() => setMode('registro')}>Crear cuenta gratis</button>
        </div>
        <form onSubmit={submit} className="form">
          {mode === 'registro' && <>
            <Field label="Nombre completo"><input required value={f.full_name} onChange={set('full_name')} /></Field>
            <Field label="WhatsApp" hint="Ej. 6035-9444. Aquí te avisamos de comentarios y clientes."><input required value={f.phone} onChange={set('phone')} inputMode="tel" /></Field>
          </>}
          <Field label="Correo"><input type="email" required value={f.email} onChange={set('email')} /></Field>
          {!DEMO && <Field label="Contraseña"><input type="password" required minLength={8} value={f.password} onChange={set('password')} /></Field>}
          {msg && <p className="notice">{msg}</p>}
          <button className="btn btn--fill btn--block" disabled={busy}>{mode === 'entrar' ? 'Entrar' : 'Crear cuenta'}</button>
        </form>
        {DEMO && (
          <div className="demo-login">
            <p className="muted">Acceso rápido (modo demo):</p>
            <button className="btn btn--ghost btn--sm" onClick={() => api.demoLogin('u-navas').then(() => nav('/panel'))}>Entrar como productor</button>
            <button className="btn btn--ghost btn--sm" onClick={() => api.demoLogin('u-admin').then(() => nav('/admin'))}>Entrar como admin</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ================================ FINCA (formulario) ================================
function FarmForm({ user, farm, onSaved }) {
  const [f, setF] = useState(farm || { name: '', province: 'Coclé', district: '', address: '', whatsapp: user.whatsapp || '', phone: '', email: user.email || '', instagram: '', tiktok: '', facebook: '', website: '', description: '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setBusy(true)
    try { onSaved(await api.saveFarm(user, { ...f, whatsapp: f.whatsapp.replace(/\D/g, '').replace(/^(\d{8})$/, '507$1') })) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} className="form form--2">
      <Field label="Nombre de la finca"><input required value={f.name} onChange={set('name')} /></Field>
      <Field label="Provincia"><select value={f.province} onChange={set('province')}>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></Field>
      <Field label="Distrito"><input value={f.district || ''} onChange={set('district')} /></Field>
      <Field label="Referencia de ubicación (opcional)" hint="Ubicación aproximada. La dirección exacta nunca es obligatoria."><input value={f.address || ''} onChange={set('address')} placeholder="Vía a Las Minas, Santa Cruz" /></Field>
      <Field label="WhatsApp" hint="Los clientes te escriben aquí."><input required value={f.whatsapp || ''} onChange={set('whatsapp')} inputMode="tel" /></Field>
      <Field label="Teléfono (opcional)"><input value={f.phone || ''} onChange={set('phone')} /></Field>
      <Field label="Instagram (usuario)"><input value={f.instagram || ''} onChange={set('instagram')} /></Field>
      <Field label="TikTok (usuario)"><input value={f.tiktok || ''} onChange={set('tiktok')} /></Field>
      <Field label="Facebook (usuario de página)"><input value={f.facebook || ''} onChange={set('facebook')} /></Field>
      <Field label="Sitio web"><input value={f.website || ''} onChange={set('website')} placeholder="https://" /></Field>
      <Field label="Descripción" hint="Rubros, razas, años de experiencia, si haces entregas."><textarea rows="4" value={f.description || ''} onChange={set('description')} /></Field>
      <div className="form__actions"><button className="btn btn--fill" disabled={busy}>{busy ? 'Guardando…' : 'Guardar finca'}</button></div>
    </form>
  )
}

// ================================ PUBLICAR ================================
export function Publish() {
  const { user, loading } = useAuth()
  const nav = useNavigate()
  const farmQ = useAsync(() => user ? api.myFarm(user) : Promise.resolve(null), [user?.id])
  const cats = useAsync(() => api.categories(), [])
  const [f, setF] = useState({ category_slug: 'lechones', title: '', breed: '', price: '', unit: 'unidad', quantity: '', description: '', images: [] })
  const [busy, setBusy] = useState(false)
  const [up, setUp] = useState(false)
  if (loading) return <div className="wrap section"><Loading /></div>
  if (!user) return (
    <div className="wrap section narrow">
      <Seo title="Publicar gratis" />
      <h1 className="h1">Publica gratis tu finca y tus productos</h1>
      <p className="lead">Crea tu cuenta, registra tu finca y publica. Tus anuncios aparecen en Google y en nuestras redes.</p>
      <Link to="/entrar" className="btn btn--accent">Crear cuenta o entrar</Link>
    </div>
  )
  if (farmQ.loading) return <div className="wrap section"><Loading /></div>
  if (!farmQ.data) return (
    <div className="wrap section narrow">
      <Seo title="Registra tu finca" />
      <h1 className="h1">Paso 1: registra tu finca</h1>
      <p className="lead">Solo una vez. Luego publicas todos los productos que quieras.</p>
      <div className="card form-card"><FarmForm user={user} onSaved={() => farmQ.reload()} /></div>
    </div>
  )
  const farm = farmQ.data
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const roots = (cats.data || []).filter((c) => !c.parent_slug)
  const addPhotos = async (e) => {
    const files = [...e.target.files].slice(0, 6 - f.images.length); if (!files.length) return
    setUp(true)
    try { const urls = await Promise.all(files.map((file) => api.uploadImage(user, file))); setF((x) => ({ ...x, images: [...x.images, ...urls] })) }
    finally { setUp(false); e.target.value = '' }
  }
  const submit = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      await api.createListing(user, farm, { ...f, price: f.price === '' ? null : Number(f.price), quantity: f.quantity === '' ? null : Number(f.quantity) })
      nav('/panel?publicado=1')
    } finally { setBusy(false) }
  }
  return (
    <div className="wrap section narrow">
      <Seo title="Publicar producto" />
      <h1 className="h1">Publicar producto</h1>
      <p className="muted">Finca: <strong>{farm.name}</strong> · {farm.province}. Revisamos cada anuncio antes de publicarlo (normalmente el mismo día).</p>
      <form onSubmit={submit} className="card form-card form form--2">
        <Field label="Categoría">
          <select value={f.category_slug} onChange={set('category_slug')}>
            {roots.map((r) => <optgroup key={r.slug} label={r.name}>{(cats.data || []).filter((c) => c.parent_slug === r.slug).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</optgroup>)}
          </select>
        </Field>
        <Field label="Título" hint="Ej. Lechones Landrace destetados"><input required maxLength={80} value={f.title} onChange={set('title')} /></Field>
        <Field label="Raza o variedad (opcional)"><input value={f.breed} onChange={set('breed')} placeholder="Landrace, Brahman, ñame diamante…" /></Field>
        <Field label="Cantidad disponible"><input type="number" min="0" value={f.quantity} onChange={set('quantity')} /></Field>
        <Field label="Precio (B/.)" hint="Déjalo vacío para 'Consultar'."><input type="number" min="0" step="0.01" value={f.price} onChange={set('price')} /></Field>
        <Field label="Unidad"><select value={f.unit} onChange={set('unit')}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></Field>
        <Field label="Descripción" hint="Edad, peso, vacunas, si haces entregas, forma de pago."><textarea rows="5" value={f.description} onChange={set('description')} /></Field>
        <Field label={`Fotos (${f.images.length}/6)`} hint="Fotos reales y con buena luz venden más.">
          <input type="file" accept="image/*" multiple onChange={addPhotos} disabled={up || f.images.length >= 6} />
        </Field>
        {f.images.length > 0 && (
          <div className="thumbs">{f.images.map((src) => (
            <button type="button" key={src.slice(-40)} style={{ backgroundImage: `url(${src})` }} title="Quitar" onClick={() => setF({ ...f, images: f.images.filter((x) => x !== src) })}>×</button>
          ))}</div>
        )}
        <label className="check"><input type="checkbox" required /> Confirmo que la información es real y acepto que se publique en las redes de la plataforma.</label>
        <div className="form__actions"><button className="btn btn--accent" disabled={busy || up}>{busy ? 'Enviando…' : 'Enviar a revisión'}</button></div>
      </form>
    </div>
  )
}

// ================================ PANEL DEL PRODUCTOR ================================
export function Dashboard() {
  const { user, loading } = useAuth()
  if (loading) return <div className="wrap section"><Loading /></div>
  if (!user) return <Navigate to="/entrar" replace />
  return (
    <div className="wrap section">
      <Seo title="Mi panel" />
      <div className="panel-head">
        <h1 className="h1">Hola, {user.full_name?.split(' ')[0] || 'productor'}</h1>
        <div><Link to="/publicar" className="btn btn--accent btn--sm">+ Publicar</Link> <button className="btn btn--ghost btn--sm" onClick={() => api.signOut()}>Salir</button></div>
      </div>
      <nav className="subnav">
        <NavLink end to="/panel">Mis anuncios</NavLink>
        <NavLink to="/panel/comentarios">Comentarios</NavLink>
        <NavLink to="/panel/finca">Mi finca</NavLink>
        <NavLink to="/panel/favoritos">Favoritos</NavLink>
        <NavLink to="/panel/precio">Reportar precio</NavLink>
      </nav>
      <Routes>
        <Route index element={<MyListings user={user} />} />
        <Route path="comentarios" element={<MyComments user={user} />} />
        <Route path="finca" element={<MyFarm user={user} />} />
        <Route path="favoritos" element={<Favorites user={user} />} />
        <Route path="precio" element={<ReportPrice user={user} />} />
      </Routes>
    </div>
  )
}

const STATUS = { pendiente: 'En revisión', aprobado: 'Publicado', rechazado: 'Rechazado', vendido: 'Vendido', vencido: 'Vencido' }

function MyListings({ user }) {
  const { data, reload } = useAsync(() => api.myListings(user), [user.id])
  const published = new URLSearchParams(location.search).get('publicado')
  if (!data) return <Loading />
  const total = (k) => data.reduce((s, l) => s + (l[k] || 0), 0)
  return (
    <>
      {published && <p className="notice notice--ok">¡Listo! Tu anuncio está en revisión. Te avisaremos cuando se publique.</p>}
      <div className="kpis">
        <div className="kpi"><span>Anuncios activos</span><strong>{data.filter((l) => l.status === 'aprobado').length}</strong></div>
        <div className="kpi"><span>Visitas</span><strong>{total('views')}</strong></div>
        <div className="kpi"><span>Contactos por WhatsApp</span><strong>{total('contacts')}</strong></div>
      </div>
      {!data.length ? <p className="empty">Aún no tienes anuncios. <Link to="/publicar">Publica el primero</Link>.</p> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Anuncio</th><th>Precio</th><th>Estado</th><th>Visitas</th><th>Contactos</th><th></th></tr></thead>
          <tbody>{data.map((l) => (
            <tr key={l.id}>
              <td><Link to={`/anuncio/${l.slug}`}>{l.title}</Link><br /><Ago iso={l.created_at} />{l.reject_reason && <><br /><span className="down small">Motivo: {l.reject_reason}</span></>}</td>
              <td className="num">{money(l.price)}<br /><span className="muted">/{l.unit}</span></td>
              <td><span className={`status status--${l.status}`}>{STATUS[l.status]}</span></td>
              <td className="num">{l.views}</td><td className="num">{l.contacts}</td>
              <td className="actions">
                {l.status === 'aprobado' && <button className="linkbtn" onClick={() => api.updateMyListing(l.id, { status: 'vendido' }).then(reload)}>Marcar vendido</button>}
                <button className="linkbtn down" onClick={() => confirm('¿Borrar este anuncio?') && api.deleteMyListing(l.id).then(reload)}>Borrar</button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  )
}

function MyComments({ user }) {
  const { data, reload } = useAsync(() => api.myComments(user), [user.id])
  const [draft, setDraft] = useState({})
  if (!data) return <Loading />
  if (!data.length) return <p className="empty">Cuando alguien comente tus anuncios en Facebook o Instagram, lo verás aquí y te avisaremos por WhatsApp.</p>
  return (
    <div className="comments">
      {data.map((c) => (
        <div key={c.id} className="card comment">
          <p className="muted small"><span className={`net net--${c.network}`}>{c.network}</span> · {c.author_name} · <Ago iso={c.created_at} /> · en <Link to={`/anuncio/${c.listing?.slug}`}>{c.listing?.title}</Link></p>
          <p>{c.message}</p>
          {c.reply ? <p className="reply"><strong>Tu respuesta:</strong> {c.reply}</p> : (
            <form className="reply-form" onSubmit={async (e) => { e.preventDefault(); await api.replyComment(c.id, draft[c.id]); reload() }}>
              <input required placeholder="Escribe tu respuesta…" value={draft[c.id] || ''} onChange={(e) => setDraft({ ...draft, [c.id]: e.target.value })} />
              <button className="btn btn--fill btn--sm">Responder</button>
            </form>
          )}
        </div>
      ))}
    </div>
  )
}

function MyFarm({ user }) {
  const q = useAsync(() => api.myFarm(user), [user.id])
  const [saved, setSaved] = useState(false)
  if (q.loading) return <Loading />
  return (
    <div className="card form-card">
      {q.data && <p className="muted">Tu página pública: <Link to={`/finca/${q.data.slug}`}>/finca/{q.data.slug}</Link> {q.data.verified ? '· ✔ Verificada' : '· Pide la verificación por WhatsApp para recibir el sello.'}</p>}
      {saved && <p className="notice notice--ok">Finca guardada.</p>}
      <FarmForm user={user} farm={q.data} onSaved={() => { setSaved(true); q.reload() }} />
    </div>
  )
}

function Favorites({ user }) {
  const { favs } = useAuth()
  const { data } = useAsync(() => api.favoriteListings(user), [user.id, favs.length])
  return <Grid items={data} empty="Toca el corazón en un anuncio para guardarlo aquí." />
}

function ReportPrice({ user }) {
  const [f, setF] = useState({ product_slug: '', product_name: '', unit: 'libra', price: '', province: 'Coclé', market: '' })
  const [done, setDone] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  useEffect(() => { if (done) { const t = setTimeout(() => setDone(false), 4000); return () => clearTimeout(t) } }, [done])
  return (
    <div className="card form-card">
      <p className="muted">¿Sabes a cuánto se está pagando hoy en tu zona? Repórtalo; un admin lo revisa y lo publica en Precios del día.</p>
      {done && <p className="notice notice--ok">¡Gracias! Tu reporte quedó en revisión.</p>}
      <form className="form form--2" onSubmit={async (e) => {
        e.preventDefault(); await api.reportPrice(user, { ...f, product_slug: f.product_name.toLowerCase().replace(/\s+/g, '-'), price: Number(f.price) })
        setDone(true); setF({ ...f, product_name: '', price: '' })
      }}>
        <Field label="Producto"><input required value={f.product_name} onChange={set('product_name')} placeholder="Cerdo en pie, novillo, ñame…" /></Field>
        <Field label="Precio (B/.)"><input required type="number" step="0.01" min="0" value={f.price} onChange={set('price')} /></Field>
        <Field label="Unidad"><select value={f.unit} onChange={set('unit')}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></Field>
        <Field label="Provincia"><select value={f.province} onChange={set('province')}>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></Field>
        <Field label="Lugar (opcional)"><input value={f.market} onChange={set('market')} placeholder="Subasta de…, Merca Panamá, en finca" /></Field>
        <div className="form__actions"><button className="btn btn--fill">Enviar precio</button></div>
      </form>
    </div>
  )
}
