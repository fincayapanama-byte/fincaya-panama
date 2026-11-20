// Datos geográficos y de actividades para los mapas
export const PANAMA = { center: [8.55, -80.1], zoom: 7 }
export const PROVINCE_CENTER = {
  'Bocas del Toro': [9.15, -82.3], 'Coclé': [8.5, -80.4], 'Colón': [9.25, -79.9], 'Chiriquí': [8.45, -82.4],
  'Darién': [8.2, -77.9], 'Herrera': [7.9, -80.7], 'Los Santos': [7.6, -80.35], 'Panamá': [9.0, -79.3],
  'Panamá Oeste': [8.85, -79.85], 'Veraguas': [8.2, -81.05], 'Comarca Ngäbe-Buglé': [8.55, -81.75],
  'Comarca Guna Yala': [9.35, -78.7], 'Comarca Emberá-Wounaan': [8.25, -77.6],
}
// Actividades (categorías principales) con su ícono y color en el mapa
export const ACTIVITIES = [
  { slug: 'porcicultura', name: 'Porcinos', icon: '🐖', color: '#E07A8B' },
  { slug: 'ganaderia', name: 'Ganado', icon: '🐄', color: '#8B5A2B' },
  { slug: 'avicultura', name: 'Aves', icon: '🐓', color: '#D9822B' },
  { slug: 'ovinocultura', name: 'Ovinos y caprinos', icon: '🐐', color: '#7A7A52' },
  { slug: 'agricultura', name: 'Agricultura', icon: '🌱', color: '#2E9E4F' },
  { slug: 'insumos', name: 'Insumos', icon: '🧪', color: '#3B7DD8' },
  { slug: 'maquinaria', name: 'Maquinaria', icon: '🚜', color: '#C0392B' },
  { slug: 'servicios', name: 'Servicios', icon: '🩺', color: '#6C5CE7' },
  { slug: 'fincas-propiedades', name: 'Fincas en venta', icon: '🏡', color: '#0B5D3B' },
]
export const activity = (slug) => ACTIVITIES.find((a) => a.slug === slug) || { slug, name: slug, icon: '📍', color: '#0B5D3B' }
