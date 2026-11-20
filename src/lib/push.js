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
  return sub
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) { await api.removePushSubscription(sub.endpoint); await sub.unsubscribe() }
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
