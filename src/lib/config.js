// ===== Marca: cambia aquí el nombre cuando lo decidan =====
export const BRAND = {
  name: 'FincaYa Panamá',
  tagline: 'Todo el agro, en un solo lugar.',
  url: 'https://fincayapanama.com',
  whatsapp: '50760359444', // WhatsApp de soporte de la plataforma
  instagram: 'fincayapanama',
  facebook: 'fincayapanama',
  tiktok: 'fincayapanama',
}

export const PROVINCES = [
  'Bocas del Toro', 'Coclé', 'Colón', 'Chiriquí', 'Darién', 'Herrera',
  'Los Santos', 'Panamá', 'Panamá Oeste', 'Veraguas',
  'Comarca Ngäbe-Buglé', 'Comarca Guna Yala', 'Comarca Emberá-Wounaan',
]

export const UNITS = ['unidad', 'cabeza', 'libra', 'kg', 'quintal', 'saco', 'docena', 'caja']

export const AD_PLACEMENTS = {
  home_top: 'Portada (banner superior)',
  busqueda_lateral: 'Búsqueda (lateral)',
  anuncio_inferior: 'Detalle de anuncio (inferior)',
  precios: 'Página de precios',
}

export const slugify = (s) =>
  String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70)

export const money = (n) =>
  n == null ? 'Consultar' : `B/. ${Number(n).toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const waLink = (number, text) =>
  `https://wa.me/${String(number || '').replace(/\D/g, '')}?text=${encodeURIComponent(text || '')}`

export const timeAgo = (iso) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 3600) return `hace ${Math.max(1, Math.round(d / 60))} min`
  if (d < 86400) return `hace ${Math.round(d / 3600)} h`
  return `hace ${Math.round(d / 86400)} días`
}
