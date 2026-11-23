// Cálculos para las publicaciones de precios: variación semanal y tendencia del mes.
// rows: [{ product_slug, product_name, unit, price, date }] de un solo mercado.
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const fechaLarga = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${d} de ${MESES[m - 1]}` }
export const fechaCorta = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${d} ${MESES[m - 1].slice(0, 3)}` }
const addDays = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10)

// Productos de la canasta que más le interesan al productor y al comprador
export const STAPLES = ['name', 'yuca', 'otoe', 'platano', 'tomate', 'cebolla', 'papa', 'arroz', 'zapallo', 'aji', 'pimenton', 'repollo', 'lechuga', 'zanahoria', 'pepino', 'guineo', 'maiz', 'frijol', 'culantro', 'apio']
const isStaple = (slug) => STAPLES.some((k) => slug.startsWith(k))

export function bySeries(rows) {
  const m = new Map()
  for (const r of rows) {
    const k = `${r.product_slug}|${r.unit}`
    if (!m.has(k)) m.set(k, { slug: r.product_slug, product_name: r.product_name, unit: r.unit, pts: new Map() })
    m.get(k).pts.set(r.date, Number(r.price)) // un precio por día (el último que llegue)
  }
  return [...m.values()].map((s) => ({ ...s, pts: clean([...s.pts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) }))
}

// Quita datos atípicos (errores de digitación del reporte): puntos a más del doble o menos de la mitad de la mediana
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0 }
function clean(pts) {
  const md = median(pts.map((p) => p[1]))
  return md ? pts.filter(([, v]) => v > 0 && v <= md * 2 && v >= md / 2) : pts
}

// Precio de hoy contra el último precio publicado hace 7 días o más (máx. 12 días atrás)
export function weeklyChanges(rows, { minChange = 0.03 } = {}) {
  const day = rows.reduce((m, r) => (r.date > m ? r.date : m), '')
  const target = addDays(day, -7), floor = addDays(day, -12)
  const list = []
  for (const s of bySeries(rows)) {
    const now = s.pts.find(([d]) => d === day); if (!now) continue
    const before = [...s.pts].reverse().find(([d]) => d <= target && d >= floor); if (!before || !before[1]) continue
    list.push({ product_slug: s.slug, product_name: s.product_name, unit: s.unit, price: now[1], prev: before[1], prevDate: before[0], change: (now[1] - before[1]) / before[1] })
  }
  const relevant = list.filter((p) => Math.abs(p.change) >= minChange)
  const ups = relevant.filter((p) => p.change > 0).sort((a, b) => b.change - a.change)
  const downs = relevant.filter((p) => p.change < 0).sort((a, b) => a.change - b.change)
  const prevDate = list.map((p) => p.prevDate).sort().pop() || target
  return { day, prevDate, total: list.length, ups, downs, stable: list.filter((p) => Math.abs(p.change) < minChange && isStaple(p.product_slug)) }
}

// Las series del mes con mayor movimiento (los productos de la canasta pesan más)
export function monthlyTrends(rows, { n = 6, minPoints = 8 } = {}) {
  const day = rows.reduce((m, r) => (r.date > m ? r.date : m), '')
  const from = addDays(day, -30)
  const out = []
  for (const s of bySeries(rows)) {
    const pts = s.pts.filter(([d]) => d >= from)
    if (pts.length < minPoints || !pts[pts.length - 1] || pts[pts.length - 1][0] < addDays(day, -3)) continue
    // Inicio suavizado (mediana de los 3 primeros días) para no exagerar un día raro
    const first = median(pts.slice(0, 3).map((p) => p[1])), last = pts[pts.length - 1][1]
    if (!first) continue
    const change = (last - first) / first
    out.push({ product_slug: s.slug, product_name: s.product_name, unit: s.unit, pts, first, last, change, score: Math.abs(change) * (isStaple(s.slug) ? 1.6 : 1) })
  }
  // Mitad alzas y mitad bajas cuando las hay, para mostrar ambos lados del mercado
  const sorted = out.filter((s) => Math.abs(s.change) >= 0.03).sort((a, b) => b.score - a.score)
  const ups = sorted.filter((s) => s.change > 0), downs = sorted.filter((s) => s.change < 0)
  const half = Math.ceil(n / 2)
  const pick = [...ups.slice(0, Math.max(half, n - downs.length)), ...downs.slice(0, Math.max(n - half, n - ups.length))].slice(0, n)
  return { day, from, series: pick.sort((a, b) => b.change - a.change) }
}
