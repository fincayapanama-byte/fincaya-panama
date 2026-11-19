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
