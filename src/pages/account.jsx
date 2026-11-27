import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { api, DEMO } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useAsync } from '../lib/useAsync'
import { PROVINCES, UNITS, money } from '../lib/config'
import { Ago, Field, Grid, Loading, Seo } from '../components/ui'
import ImageCropper from '../components/ImageCropper'
import { LocationPicker } from '../components/FarmMap'
import { Notifications } from '../components/Notify'
import SectionNav from '../components/SectionNav'
import { ACTIVITIES, PROVINCE_CENTER } from '../lib/geo'

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
      if (mode === 'olvido') { await api.requestPasswordReset(f.email); setMsg('Listo. Si ese correo tiene cuenta, te enviamos un enlace para crear una contraseña nueva. Revisa también el spam.') }
      else if (mode === 'entrar') await api.signIn(f.email, f.password)
      else { await api.signUp(f); if (!DEMO) setMsg('Revisa tu correo para confirmar la cuenta y luego entra.') }
    } catch (err) { setMsg(err.message || 'No se pudo completar.') } finally { setBusy(false) }
  }
  return (
    <div className="wrap section narrow">
      <Seo title={mode === 'registro' ? 'Crear cuenta' : 'Entrar'} />
      <div className="card form-card">
        <div className="tabs">
          <button className={mode === 'entrar' ? 'is-on' : ''} onClick={() => setMode('entrar')}>Entrar</button>
          <button className={mode === 'registro' ? 'is-on' : ''} onClick={() => setMode('registro')}>Crear cuenta gratis</button>
        </div>
        <form onSubmit={submit} className="form">
          {mode === 'registro' && <>
            <Field label="Nombre completo"><input required value={f.full_name} onChange={set('full_name')} /></Field>
            <Field label="WhatsApp" hint="Ej. 6291-3387. Aquí te avisamos de comentarios y clientes."><input required value={f.phone} onChange={set('phone')} inputMode="tel" /></Field>
          </>}
          <Field label="Correo"><input type="email" required value={f.email} onChange={set('email')} /></Field>
          {!DEMO && mode !== 'olvido' && <Field label="Contraseña"><input type="password" required minLength={8} value={f.password} onChange={set('password')} /></Field>}
          {mode === 'olvido' && <p className="muted">Escribe tu correo y te enviamos un enlace para crear una contraseña nueva.</p>}
          {msg && <p className="notice">{msg}</p>}
          <button className="btn btn--fill btn--block" disabled={busy}>{mode === 'entrar' ? 'Entrar' : mode === 'olvido' ? 'Enviarme el enlace' : 'Crear cuenta'}</button>
          {!DEMO && mode === 'entrar' && <button type="button" className="btn btn--ghost btn--block" onClick={() => { setMode('olvido'); setMsg('') }}>¿Olvidaste tu contraseña?</button>}
          {mode === 'olvido' && <button type="button" className="btn btn--ghost btn--block" onClick={() => { setMode('entrar'); setMsg('') }}>Volver a entrar</button>}
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

// ================================ RESTABLECER CONTRASEÑA ================================
export function ResetPassword() {
  const nav = useNavigate()
  const [ready, setReady] = useState(null) // null = comprobando
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  useEffect(() => {
    let alive = true
    // El enlace del correo trae la sesión de recuperación; le damos un instante a Supabase para leerla
    const t = setTimeout(async () => { const ok = await api.hasRecoverySession(); if (alive) setReady(ok) }, 700)
    return () => { alive = false; clearTimeout(t) }
  }, [])
  const submit = async (e) => {
    e.preventDefault(); setMsg('')
    if (p1.length < 8) return setMsg('La contraseña debe tener al menos 8 caracteres.')
    if (p1 !== p2) return setMsg('Las contraseñas no coinciden.')
    setBusy(true)
    try { await api.setNewPassword(p1); setDone(true); setTimeout(() => nav('/panel'), 1500) }
    catch (err) { setMsg(err.message || 'No se pudo cambiar la contraseña.') } finally { setBusy(false) }
  }
  return (
    <div className="wrap section narrow">
      <Seo title="Nueva contraseña" noindex />
      <div className="card form-card">
        <h1 className="h2">Crear contraseña nueva</h1>
        {ready === null && <p className="muted">Comprobando tu enlace…</p>}
        {ready === false && <>
          <p className="notice">El enlace venció o ya se usó. Pide uno nuevo.</p>
          <Link className="btn btn--fill btn--block" to="/entrar">Volver a entrar</Link>
        </>}
        {ready && !done && (
          <form onSubmit={submit} className="form">
            <Field label="Contraseña nueva" hint="Mínimo 8 caracteres."><input type="password" required minLength={8} value={p1} onChange={(e) => setP1(e.target.value)} autoComplete="new-password" /></Field>
            <Field label="Repite la contraseña"><input type="password" required minLength={8} value={p2} onChange={(e) => setP2(e.target.value)} autoComplete="new-password" /></Field>
            {msg && <p className="notice">{msg}</p>}
            <button className="btn btn--fill btn--block" disabled={busy}>Guardar contraseña</button>
          </form>
        )}
        {done && <p className="notice">✅ Contraseña cambiada. Te llevamos a tu panel…</p>}
      </div>
    </div>
  )
}

// ================================ FINCA (formulario) ================================
function FarmForm({ user, farm, onSaved }) {
  const [f, setF] = useState(farm || { activities: [], show_on_map: true, name: '', province: 'Coclé', district: '', address: '', whatsapp: user.whatsapp || '', phone: '', email: user.email || '', instagram: '', tiktok: '', facebook: '', website: '', description: '' })
  const [busy, setBusy] = useState(false)
  const [up, setUp] = useState('')
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  // Logo cuadrado (600×600) y portada 16:9 (1600×900): se recortan antes de subir
  const [crop, setCrop] = useState(null) // { key, file }
  const photo = (k) => (e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) setCrop({ key: k, file }) }
  const upload = async (file) => {
    const k = crop.key; setCrop(null); setUp(k)
    try { const url = await api.uploadImage(user, file); setF((x) => ({ ...x, [k]: url })) }
    catch (er) { setErr(er.message || 'No se pudo subir la imagen') }
    finally { setUp('') }
  }
  const toggleAct = (slug) => setF((x) => { const a = x.activities || []; return { ...x, activities: a.includes(slug) ? a.filter((s) => s !== slug) : [...a, slug] } })
  const [locMsg, setLocMsg] = useState('')
  const useMyLocation = () => {
    if (!navigator.geolocation) return setLocMsg('Tu navegador no permite obtener la ubicación.')
    setLocMsg('Buscando tu ubicación…')
    navigator.geolocation.getCurrentPosition(
      (p) => { setF((x) => ({ ...x, lat: Math.round(p.coords.latitude * 1e4) / 1e4, lng: Math.round(p.coords.longitude * 1e4) / 1e4 })); setLocMsg('Ubicación marcada. Puedes mover el pin si hace falta.') },
      () => setLocMsg('No pudimos obtener tu ubicación. Toca el mapa para marcarla.'),
      { enableHighAccuracy: true, timeout: 10000 })
  }
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { onSaved(await api.saveFarm(user, { ...f, whatsapp: (f.whatsapp || '').replace(/\D/g, '').replace(/^(\d{8})$/, '507$1') })) }
    catch (er) { setErr(er.message || 'No se pudo guardar tu perfil') }
    finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} className="form form--2">
      <div className="farm-images">
        <label className="logo-up" title="Logo o foto de perfil">
          {f.logo_url ? <img src={f.logo_url} alt="Logo" /> : <span>{up === 'logo_url' ? 'Subiendo…' : '+ Logo'}</span>}
          <input type="file" accept="image/*" onChange={photo('logo_url')} hidden />
        </label>
        <label className="cover-up" title="Foto de portada" style={f.cover_url ? { backgroundImage: `url(${f.cover_url})` } : undefined}>
          {!f.cover_url && <span>{up === 'cover_url' ? 'Subiendo…' : '+ Foto de portada (tu finca, tus animales, cultivos o equipos)'}</span>}
          {f.cover_url && <span className="cover-up__change">Cambiar portada</span>}
          <input type="file" accept="image/*" onChange={photo('cover_url')} hidden />
        </label>
      </div>
      <Field label="Nombre de la finca, productor o vendedor"><input required value={f.name} onChange={set('name')} /></Field>
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
      <div className="form__full">
        <p className="field__label">¿Qué produces o vendes?</p>
        <p className="muted small">Define el ícono con el que apareces en el mapa.</p>
        <div className="chips chips--wrap">
          {ACTIVITIES.map((a) => (
            <button type="button" key={a.slug} className={`chip ${(f.activities || []).includes(a.slug) ? 'is-on' : ''}`} onClick={() => toggleAct(a.slug)}>{a.icon} {a.name}</button>
          ))}
        </div>
      </div>
      <div className="form__full">
        <p className="field__label">Ubicación en el mapa</p>
        <p className="muted small">Toca el mapa o arrastra el pin. Puede ser aproximada (la entrada del camino o el pueblo más cercano).</p>
        <div className="loc-actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={useMyLocation}>📍 Usar mi ubicación actual</button>
          {f.lat != null && <button type="button" className="linkbtn" onClick={() => setF((x) => ({ ...x, lat: null, lng: null }))}>Quitar ubicación</button>}
          {locMsg && <span className="muted small">{locMsg}</span>}
        </div>
        <LocationPicker lat={f.lat} lng={f.lng} center={PROVINCE_CENTER[f.province]} onChange={(lat, lng) => setF((x) => ({ ...x, lat, lng }))} />
        <label className="check"><input type="checkbox" checked={f.show_on_map !== false} onChange={(e) => setF((x) => ({ ...x, show_on_map: e.target.checked }))} /> Mostrar mi finca en el mapa público</label>
      </div>
      {err && <p className="notice form__actions">{err}</p>}
      <div className="form__actions"><button className="btn btn--fill" disabled={busy || !!up}>{busy ? 'Guardando…' : 'Guardar perfil'}</button></div>
      {crop && <ImageCropper file={crop.file} aspect={crop.key === 'logo_url' ? 1 : 16 / 9} outW={crop.key === 'logo_url' ? 600 : 1600} round={crop.key === 'logo_url'}
        title={crop.key === 'logo_url' ? 'Ajusta el logo' : 'Ajusta la foto de portada'} onDone={upload} onCancel={() => setCrop(null)} />}
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
      <p className="lead">Crea tu cuenta, regístrate como finca, productor o vendedor y publica. Tus anuncios aparecen en Google y en nuestras redes.</p>
      <Link to="/entrar" className="btn btn--accent">Crear cuenta o entrar</Link>
    </div>
  )
  if (farmQ.loading) return <div className="wrap section"><Loading /></div>
  if (!farmQ.data) return (
    <div className="wrap section narrow">
      <Seo title="Registrarse" />
      <h1 className="h1">Paso 1: Registrarse</h1>
      <p className="lead">Solo una vez. Sirve para fincas, productores y vendedores: venta de animales y cosechas, fincas y propiedades o alquiler de equipos. Luego publicas todo lo que quieras.</p>
      <div className="card form-card"><FarmForm user={user} onSaved={() => { farmQ.reload(); window.scrollTo(0, 0) }} /></div>
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
      <p className="muted">Perfil: <strong>{farm.name}</strong> · {farm.province}. Revisamos cada anuncio antes de publicarlo (normalmente el mismo día).</p>
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
      <SectionNav label="Mi panel" items={[
        { to: '/panel', label: 'Mis anuncios', end: true }, { to: '/panel/avisos', label: 'Avisos' },
        { to: '/panel/comentarios', label: 'Comentarios' }, { to: '/panel/finca', label: 'Mi perfil' },
        { to: '/panel/favoritos', label: 'Favoritos' }, { to: '/panel/precio', label: 'Reportar precio' }]} />
      <Routes>
        <Route index element={<MyListings user={user} />} />
        <Route path="avisos" element={<Notifications user={user} />} />
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
  const qs = new URLSearchParams(location.search)
  const published = qs.get('publicado')
  const farmSaved = qs.get('finca')
  if (!data) return <Loading />
  const total = (k) => data.reduce((s, l) => s + (l[k] || 0), 0)
  return (
    <>
      {farmSaved && <p className="notice notice--ok">✅ Perfil guardado. Ya puedes <Link to="/publicar">publicar tu primer anuncio</Link>.</p>}
      {published && <p className="notice notice--ok">¡Listo! Tu anuncio está en revisión. Te avisaremos cuando se publique.</p>}
      <div className="kpis">
        <div className="kpi"><span>Anuncios activos</span><strong>{data.filter((l) => l.status === 'aprobado').length}</strong></div>
        <div className="kpi"><span>Visitas</span><strong>{total('views')}</strong></div>
        <div className="kpi"><span>Contactos por WhatsApp</span><strong>{total('contacts')}</strong></div>
      </div>
      {!data.length ? <p className="empty">Aún no tienes anuncios. <Link to="/publicar">Publica el primero</Link>.</p> : (
        <div className="table-wrap"><table className="table mylist">
          <thead><tr><th>Anuncio</th><th>Precio</th><th>Estado</th><th>Visitas</th><th>Contactos</th><th></th></tr></thead>
          <tbody>{data.map((l) => (
            <tr key={l.id}>
              <td className="ml-title"><Link to={`/anuncio/${l.slug}`}>{l.title}</Link><br /><Ago iso={l.created_at} />{l.reject_reason && <><br /><span className="down small">Motivo: {l.reject_reason}</span></>}</td>
              <td className="num ml-price">{money(l.price)}<br /><span className="muted">/{l.unit}</span></td>
              <td className="ml-status"><span className={`status status--${l.status}`}>{STATUS[l.status]}</span></td>
              <td className="num ml-stat" data-l="visitas">{l.views}</td><td className="num ml-stat" data-l="contactos">{l.contacts}</td>
              <td className="actions ml-actions">
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
  const [sending, setSending] = useState('')
  const [replyErr, setReplyErr] = useState('')
  if (!data) return <Loading />
  if (!data.length) return <p className="empty">Cuando alguien comente tus anuncios en Facebook o Instagram, lo verás aquí y te avisaremos por WhatsApp.</p>
  return (
    <div className="comments">
      {data.map((c) => (
        <div key={c.id} className="card comment">
          <p className="muted small"><span className={`net net--${c.network}`}>{c.network}</span> · {c.author_name} · <Ago iso={c.created_at} /> · en <Link to={`/anuncio/${c.listing?.slug}`}>{c.listing?.title}</Link></p>
          <p>{c.message}</p>
          {c.reply ? <p className="reply"><strong>Tu respuesta:</strong> {c.reply}</p> : (c.network === 'facebook' && c.external_comment_id) ? (
            <p className="muted small">Responde este comentario directamente en Facebook. <a className="btn btn--sm" href={`https://www.facebook.com/${c.external_comment_id}`} target="_blank" rel="noopener noreferrer">Responder en Facebook</a></p>
          ) : (
            <form className="reply-form" onSubmit={async (e) => { e.preventDefault(); setReplyErr(''); setSending(c.id); try { await api.replyComment(c.id, draft[c.id]); reload() } catch (er) { setReplyErr(er.message || 'No se pudo enviar la respuesta.') } finally { setSending('') } }}>
              <input required placeholder="Escribe tu respuesta…" value={draft[c.id] || ''} onChange={(e) => setDraft({ ...draft, [c.id]: e.target.value })} />
              <button className="btn btn--fill btn--sm" disabled={sending === c.id}>{sending === c.id ? 'Enviando…' : 'Responder'}</button>
            </form>
          )}
          {replyErr && sending === '' && !c.reply && draft[c.id] && <p className="notice">{replyErr}</p>}
        </div>
      ))}
    </div>
  )
}

function MyFarm({ user }) {
  const q = useAsync(() => api.myFarm(user), [user.id])
  const nav = useNavigate()
  if (q.loading) return <Loading />
  return (
    <div className="card form-card">
      {q.data && <p className="muted">Tu página pública: <Link to={`/finca/${q.data.slug}`}>/finca/{q.data.slug}</Link> {q.data.verified ? '· ✔ Verificada' : '· Pide la verificación por WhatsApp para recibir el sello.'}</p>}
      <FarmForm user={user} farm={q.data} onSaved={() => nav('/panel?finca=1')} />
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
