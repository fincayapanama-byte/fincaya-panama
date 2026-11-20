// Mapas con Leaflet + OpenStreetMap: mapa de fincas y selector de ubicación.
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PANAMA, activity } from '../lib/geo'

const TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// En celulares el mapa empieza "bloqueado": el dedo desplaza la página y no el mapa.
// Se desbloquea con un toque en el aviso y se vuelve a bloquear con "Listo".
const isTouch = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
function useLock(map) {
  const [locked, setLocked] = useState(isTouch())
  useEffect(() => {
    const m = map.current; if (!m) return
    const h = [m.dragging, m.touchZoom, m.doubleClickZoom, m.boxZoom, m.keyboard]
    if (m.tap) h.push(m.tap)
    h.forEach((x) => (locked ? x.disable() : x.enable()))
    m.getContainer().style.touchAction = locked ? 'pan-y' : 'none'
  }, [locked, map.current])
  return [locked, setLocked]
}
function Lock({ locked, setLocked, text }) {
  if (!isTouch()) return null
  return locked
    ? <button type="button" className="maplock" onClick={() => setLocked(false)}><span>👆 {text}</span></button>
    : <button type="button" className="maplock__done" onClick={() => setLocked(true)}>✓ Listo</button>
}

export const pinIcon = (act) => {
  const a = activity(act)
  return L.divIcon({ className: 'pin', html: `<span style="--c:${a.color}"><i>${a.icon}</i></span>`, iconSize: [38, 46], iconAnchor: [19, 44], popupAnchor: [0, -40] })
}

// Mapa con varias fincas. farms: [{ slug, name, lat, lng, district, province, logo_url, activities }]
export function FarmsMap({ farms, height = 520, focus, onBoundsChange, lockText = 'Toca para mover el mapa' }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null)
  const [ready, setReady] = useState(false)
  const [locked, setLocked] = useLock(map)
  useEffect(() => {
    map.current = L.map(el.current, { scrollWheelZoom: false, tap: true }).setView(PANAMA.center, PANAMA.zoom)
    L.tileLayer(TILES, { attribution: ATTR, maxZoom: 18 }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    map.current.on('click', () => map.current.scrollWheelZoom.enable())
    if (onBoundsChange) map.current.on('moveend', () => onBoundsChange(map.current.getBounds()))
    setReady(true)
    return () => map.current.remove()
  }, [])
  useEffect(() => {
    layer.current.clearLayers()
    const pts = []
    for (const f of farms || []) {
      if (f.lat == null || f.lng == null) continue
      const acts = (f.activities || []).map(activity)
      const m = L.marker([f.lat, f.lng], { icon: pinIcon(f.activities?.[0]), title: f.name })
      m.bindPopup(`<div class="mpop">${f.logo_url ? `<img src="${esc(f.logo_url)}" alt="">` : ''}<div><strong>${esc(f.name)}</strong>${f.verified ? ' <span class="mpop__v">✔</span>' : ''}<br>
        <span>${esc([f.district, f.province].filter(Boolean).join(', '))}</span><br><span class="mpop__acts">${acts.map((a) => `${a.icon} ${esc(a.name)}`).join(' · ')}</span><br>
        <a href="/finca/${esc(f.slug)}" data-link>Ver finca →</a></div></div>`)
      m.addTo(layer.current); pts.push([f.lat, f.lng])
    }
    if (!focus && pts.length > 1) map.current.fitBounds(pts, { padding: [40, 40], maxZoom: 10 })
    else if (!focus && pts.length === 1) map.current.setView(pts[0], 10)
  }, [farms])
  useEffect(() => { if (focus) map.current.setView(focus.center, focus.zoom || 9) }, [focus])
  return (
    <div className="mapframe" data-ready={ready}>
      <div ref={el} className="leaflet-box" style={{ height }} />
      <Lock locked={locked} setLocked={setLocked} text={lockText} />
    </div>
  )
}

// Selector: el productor toca el mapa o arrastra el pin para marcar su finca (aproximado).
export function LocationPicker({ lat, lng, center, onChange, height = 320 }) {
  const el = useRef(null), map = useRef(null), mk = useRef(null)
  const [, setReady] = useState(false)
  const [locked, setLocked] = useLock(map)
  const place = (ll) => {
    if (!mk.current) {
      mk.current = L.marker(ll, { icon: pinIcon(), draggable: true }).addTo(map.current)
      mk.current.on('dragend', () => { const p = mk.current.getLatLng(); onChange(round(p.lat), round(p.lng)) })
    } else mk.current.setLatLng(ll)
  }
  const round = (n) => Math.round(n * 10000) / 10000 // ~10 m
  const lockedRef = useRef(locked); lockedRef.current = locked
  useEffect(() => {
    const start = lat != null ? [lat, lng] : center || PANAMA.center
    map.current = L.map(el.current).setView(start, lat != null ? 14 : center ? 10 : PANAMA.zoom)
    L.tileLayer(TILES, { attribution: ATTR, maxZoom: 18 }).addTo(map.current)
    if (lat != null) place([lat, lng])
    map.current.on('click', (e) => { if (lockedRef.current) return; place(e.latlng); onChange(round(e.latlng.lat), round(e.latlng.lng)) })
    setReady(true)
    return () => { map.current.remove(); mk.current = null }
  }, [])
  useEffect(() => { if (lat == null && center) map.current.setView(center, 10) }, [center?.[0], center?.[1]])
  useEffect(() => { if (lat != null) { place([lat, lng]); } else if (mk.current) { mk.current.remove(); mk.current = null } }, [lat, lng])
  useEffect(() => { if (mk.current) locked ? mk.current.dragging?.disable() : mk.current.dragging?.enable() }, [locked, lat])
  return (
    <div className="mapframe">
      <div ref={el} className="leaflet-box" style={{ height }} />
      <Lock locked={locked} setLocked={setLocked} text={lat != null ? 'Toca para mover el pin' : 'Toca aquí para marcar tu finca'} />
    </div>
  )
}
