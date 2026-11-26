// Lectura de Supabase desde funciones de Vercel (solo datos públicos, vía REST).
const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
export const SITE = process.env.SITE_URL || 'https://fincayapanama.com'
export const BRAND = process.env.BRAND_NAME || 'FincaYa Panamá'

export async function q(path) {
  if (!URL || !KEY) return []
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  if (!r.ok) return []
  return r.json()
}
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export const slugify = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
// Mismas regiones que PROVINCES en src/lib/config.js (validan las URLs /c/:cat/:prov)
export const PROVINCES = ['Bocas del Toro', 'Coclé', 'Colón', 'Chiriquí', 'Darién', 'Herrera', 'Los Santos', 'Panamá', 'Panamá Oeste', 'Veraguas', 'Comarca Ngäbe-Buglé', 'Comarca Guna Yala', 'Comarca Emberá-Wounaan']
export const PROV_BY_SLUG = Object.fromEntries(PROVINCES.map((p) => [slugify(p), p]))
