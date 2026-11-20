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

export async function enablePush(user) {
  if (DEMO) throw new Error('En modo demo no se envían notificaciones.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Permiso de notificaciones no concedido.')
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'))
  await navigator.serviceWorker.ready
  const key = await api.vapidKey()
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(key) }))
  await api.savePushSubscription(user, sub)
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
