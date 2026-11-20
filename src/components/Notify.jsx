// Centro de avisos, campana del encabezado y tarjeta para activar notificaciones
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { Ago, Loading } from './ui'
import { canInstall, disablePush, enablePush, isIOS, isStandalone, onInstallChange, promptInstall, pushState } from '../lib/push'

export function Bell({ user }) {
  const [n, setN] = useState(0)
  const loc = useLocation()
  useEffect(() => {
    let alive = true
    const tick = () => api.unreadCount(user).then((c) => alive && setN(c)).catch(() => {})
    tick(); const t = setInterval(tick, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [user.id, loc.pathname])
  return (
    <Link to="/panel/avisos" className="bell" aria-label={`Avisos${n ? `: ${n} sin leer` : ''}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
      {n > 0 && <span className="bell__n">{n > 9 ? '9+' : n}</span>}
    </Link>
  )
}

export function NotifyCard({ user, admin = false }) {
  const [st, setSt] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [inst, setInst] = useState(canInstall())
  useEffect(() => { pushState().then(setSt); return onInstallChange(setInst) }, [])
  const on = async () => {
    setBusy(true); setMsg('')
    try { await enablePush(user); setSt('on'); const r = await api.testNotification(); setMsg(r?.pushes ? 'Listo. Te enviamos un aviso de prueba.' : 'Activado. Si no ves el aviso de prueba, revisa los permisos del celular.') }
    catch (e) { setMsg(e.message || 'No se pudo activar'); setSt(await pushState()) }
    finally { setBusy(false) }
  }
  const off = async () => { setBusy(true); await disablePush().catch(() => {}); setSt('off'); setBusy(false) }
  const what = admin ? 'cuando llegue un anuncio por aprobar' : 'cuando aprueben tu anuncio o te comenten en redes'
  return (
    <div className="card notify-card">
      <div className="notify-card__icon" aria-hidden="true">🔔</div>
      <div className="notify-card__body">
        <p className="notify-card__title">{st === 'on' ? 'Notificaciones activadas en este celular' : 'Recibe avisos en tu celular'}</p>
        {st === 'ios-install' && <p className="muted small">En iPhone primero instala la app: toca <b>Compartir</b> <span aria-hidden="true">⬆️</span> y luego <b>"Agregar a pantalla de inicio"</b>. Abre FincaYa desde ese ícono y activa aquí los avisos.</p>}
        {st === 'unsupported' && <p className="muted small">Este navegador no permite notificaciones. Usa Chrome en Android o instala la app en iPhone.</p>}
        {st === 'denied' && <p className="muted small">Bloqueaste las notificaciones. Actívalas en los ajustes del navegador para fincayapanama.com.</p>}
        {(st === 'off' || st === 'on') && <p className="muted small">Te avisamos {what}, aunque no tengas la página abierta.</p>}
        {msg && <p className="small notify-card__msg">{msg}</p>}
        <div className="notify-card__actions">
          {st === 'off' && <button className="btn btn--fill btn--sm" onClick={on} disabled={busy}>{busy ? 'Activando…' : 'Activar notificaciones'}</button>}
          {st === 'on' && <button className="btn btn--ghost btn--sm" onClick={off} disabled={busy}>Desactivar</button>}
          {inst && !isStandalone() && <button className="btn btn--ghost btn--sm" onClick={promptInstall}>📲 Instalar app</button>}
        </div>
      </div>
    </div>
  )
}

export function Notifications({ user }) {
  const [list, setList] = useState(null)
  useEffect(() => { api.notifications(user).then((l) => { setList(l); if (l.some((n) => !n.read_at)) api.markAllRead(user).catch(() => {}) }) }, [user.id])
  const rel = (u) => (u || '/').replace(/^https?:\/\/[^/]+/, '')
  return (
    <>
      <NotifyCard user={user} admin={user.role === 'admin'} />
      <h2 className="h2">Avisos</h2>
      {!list ? <Loading /> : !list.length ? <p className="empty">Aún no tienes avisos. Aquí verás cuando aprueben tus anuncios, te comenten en redes o haya novedades.</p> : (
        <ul className="notif-list">
          {list.map((n) => (
            <li key={n.id} className={n.read_at ? '' : 'is-new'}>
              <Link to={rel(n.url)}>
                <strong>{n.title}</strong>
                {n.body && <span>{n.body}</span>}
                <Ago iso={n.created_at} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
