// Mapas con Leaflet + OpenStreetMap: mapa de fincas y selector de ubicación.
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PANAMA, activity } from '../lib/geo'

const TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export const pinIcon = (act) => {
  const a = activity(act)
  return L.divIcon({ className: 'pin', html: `<span style="--c:${a.color}"><i>${a.icon}</i></span>`, iconSize: [38, 46], iconAnchor: [19, 44], popupAnchor: [0, -40] })
}

// Mapa con varias fincas. farms: [{ slug, name, lat, lng, district, province, logo_url, activities }]
export function FarmsMap({ farms, height = 520, focus, onBoundsChange }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null)
  useEffect(() => {
    map.current = L.map(el.current, { scrollWheelZoom: false, tap: true }).setView(PANAMA.center, PANAMA.zoom)
    L.tileLayer(TILES, { attribution: ATTR, maxZoom: 18 }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    map.current.on('click', () => map.current.scrollWheelZoom.enable())
    if (onBoundsChange) map.current.on('moveend', () => onBoundsChange(map.current.getBounds()))
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
  return <div ref={el} className="leaflet-box" style={{ height }} />
}

// Selector: el productor toca el mapa o arrastra el pin para marcar su finca (aproximado).
export function LocationPicker({ lat, lng, center, onChange, height = 320 }) {
  const el = useRef(null), map = useRef(null), mk = useRef(null)
  const place = (ll) => {
    if (!mk.current) {
      mk.current = L.marker(ll, { icon: pinIcon(), draggable: true }).addTo(map.current)
      mk.current.on('dragend', () => { const p = mk.current.getLatLng(); onChange(round(p.lat), round(p.lng)) })
    } else mk.current.setLatLng(ll)
  }
  const round = (n) => Math.round(n * 10000) / 10000 // ~10 m
  useEffect(() => {
    const start = lat != null ? [lat, lng] : center || PANAMA.center
    map.current = L.map(el.current).setView(start, lat != null ? 14 : center ? 10 : PANAMA.zoom)
    L.tileLayer(TILES, { attribution: ATTR, maxZoom: 18 }).addTo(map.current)
    if (lat != null) place([lat, lng])
    map.current.on('click', (e) => { place(e.latlng); onChange(round(e.latlng.lat), round(e.latlng.lng)) })
    return () => { map.current.remove(); mk.current = null }
  }, [])
  useEffect(() => { if (lat == null && center) map.current.setView(center, 10) }, [center?.[0], center?.[1]])
  useEffect(() => { if (lat != null) { place([lat, lng]); } else if (mk.current) { mk.current.remove(); mk.current = null } }, [lat, lng])
  return <div ref={el} className="leaflet-box" style={{ height }} />
}
