// Notificaciones push (Web Push) y app instalable (PWA)
import { api, DEMO } from './api'

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export function registerSW() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

const b64ToU8 = (b) => { const p = '='.repeat((4 - (b.length % 4)) % 4); const r = atob((b + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, (c) => c.charCodeAt(0)) }

// Preferencias de este celular: si la persona desactiva los avisos, no se los volvemos a activar sola
const LS = { get: (k) => { try { return localStorage.getItem(k) } catch { return null } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* sin almacenamiento */ } } }
export const pushOptedOut = () => LS.get('fy_push_off') === '1'
const ASK_EVERY = 7 * 864e5 // si cierra la ventana de permiso sin decidir, no insistimos antes de 7 días

// Estado: 'unsupported' | 'ios-install' | 'denied' | 'on' | 'off'
export async function pushState() {
  if (isIOS() && !isStandalone()) return 'ios-install'
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

// Cada paso tiene tiempo límite: si el celular no responde, explicamos en cuál se quedó.
const withTimeout = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))])
export const isBrave = async () => !!(navigator.brave && (await navigator.brave.isBrave?.()))
const isSamsung = () => /SamsungBrowser/i.test(navigator.userAgent)

export async function enablePush(user, onStep = () => {}) {
  if (DEMO) throw new Error('En modo demo no se envían notificaciones.')
  if (await isBrave()) throw new Error('Brave bloquea las notificaciones. Abre fincayapanama.com en Google Chrome para activarlas.')
  onStep('Pidiendo permiso…')
  const perm = Notification.permission === 'granted' ? 'granted'
    : await withTimeout(Notification.requestPermission(), 20000, isStandalone()
      ? 'Chrome no mostró la ventana de permiso. Actívalo así:\n1. Mantén presionado el ícono de FincaYa → ⓘ Información de la app → Notificaciones → Permitir.\n2. Vuelve aquí y toca "Intentar de nuevo".'
      : 'Chrome no mostró la ventana de permiso. Actívalo así:\n1. Toca el candado 🔒 (o la campana 🔕) junto a fincayapanama.com en la barra de direcciones.\n2. Permisos → Notificaciones → Permitir.\n3. Toca "Intentar de nuevo".')
  if (perm !== 'granted') throw new Error('No se concedió el permiso. Actívalo en Ajustes → Apps → FincaYa (o Chrome) → Notificaciones.')
  onStep('Preparando la app…')
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'))
  await withTimeout(navigator.serviceWorker.ready, 15000, 'La app no terminó de cargar. Cierra la app, ábrela de nuevo e intenta otra vez.')
  onStep('Conectando con el servidor…')
  const key = await withTimeout(api.vapidKey(), 15000, 'Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.')
  onStep('Registrando este celular…')
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    try {
      sub = await withTimeout(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(key) }), 20000,
        isSamsung() ? 'El navegador de Samsung no completó el registro. Abre fincayapanama.com en Google Chrome e intenta de nuevo.'
          : 'El servicio de notificaciones de Google no respondió. Usa Google Chrome actualizado y revisa que tenga datos o wifi.')
    } catch (e) {
      if (/push service|AbortError|registration/i.test(e.message || e.name)) throw new Error('El celular rechazó el registro de notificaciones. Usa Google Chrome actualizado (no Brave ni modo incógnito).')
      throw e
    }
  }
  onStep('Guardando…')
  await withTimeout(api.savePushSubscription(user, sub), 15000, 'No se pudo guardar el registro. Intenta de nuevo.')
  LS.set('fy_push_off', null); LS.set('fy_push_user', user.id)
  return sub
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) { await api.removePushSubscription(sub.endpoint); await sub.unsubscribe() }
  LS.set('fy_push_off', '1')
}

// Avisos activados por defecto: al iniciar sesión se pide el permiso solo, como en cualquier app.
// - Permiso ya concedido: se registra este celular a la cuenta en silencio.
// - Permiso sin decidir: se pregunta en el primer toque (los navegadores lo exigen) y no más de una vez cada 7 días.
// - Bloqueado, desactivado por la persona, iPhone sin instalar o navegador sin soporte: no se hace nada.
// Devuelve una función para cancelar.
export function autoEnablePush(user) {
  if (DEMO || !user || !pushSupported() || pushOptedOut() || (isIOS() && !isStandalone())) return () => {}
  if (Notification.permission === 'denied') return () => {}
  if (Notification.permission === 'granted') {
    // ya registrado para esta cuenta en este celular: no repetimos el trabajo en cada carga
    navigator.serviceWorker.getRegistration().then((r) => r?.pushManager.getSubscription()).then((sub) => {
      if (!(sub && LS.get('fy_push_user') === user.id)) return enablePush(user)
    }).catch(() => {})
    return () => {}
  }
  const last = Number(LS.get('fy_push_asked') || 0)
  if (Date.now() - last < ASK_EVERY) return () => {}
  const ask = () => { LS.set('fy_push_asked', String(Date.now())); enablePush(user).catch(() => {}) }
  window.addEventListener('click', ask, { once: true })
  return () => window.removeEventListener('click', ask)
}

// "Instalar app" (Android/Chrome): guardamos el evento para mostrar nuestro botón
let deferred = null
const listeners = new Set()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; listeners.forEach((f) => f(true)) })
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((f) => f(false)) })
}
export const canInstall = () => !!deferred
export const onInstallChange = (f) => { listeners.add(f); return () => listeners.delete(f) }
export async function promptInstall() { if (!deferred) return false; deferred.prompt(); const r = await deferred.userChoice; deferred = null; listeners.forEach((f) => f(false)); return r.outcome === 'accepted' }
