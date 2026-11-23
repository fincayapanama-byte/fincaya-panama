import { Link } from 'react-router-dom'

// Mini gráfico de área para una serie de precios
function TrendSpark({ vals, up }) {
  const w = 200, h = 64, pad = 4
  const mn = Math.min(...vals), mx = Math.max(...vals), sp = mx - mn || mx * 0.05 || 1
  const P = vals.map((v, i) => [(i / Math.max(1, vals.length - 1)) * w, pad + (h - 2 * pad) * (1 - (v - mn) / sp)])
  const line = P.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const col = up ? 'var(--trend-up)' : 'var(--trend-down)'
  const id = `tg${Math.random().toString(36).slice(2, 8)}`
  const [ex, ey] = P[P.length - 1]
  return (
    <svg className="trend__svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={col} stopOpacity=".22" /><stop offset="1" stopColor={col} stopOpacity="0" /></linearGradient></defs>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={col} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={ex} cy={ey} r="3.5" fill={col} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// Tarjetas con la tendencia de 30 días de los productos que más se movieron
export default function TrendGrid({ items }) {
  if (!items) return <div className="trend trend--loading">{Array.from({ length: 10 }, (_, i) => <div key={i} className="trend__card trend__card--sk" />)}</div>
  if (!items.length) return <p className="empty">Aún no hay suficiente historial para mostrar la tendencia del mes.</p>
  return (
    <div className="trend">
      {items.map((s, i) => {
        const up = s.change > 0
        return (
          <Link key={`${s.product_slug}|${s.unit}`} to={`/precios/${s.product_slug}`} className="trend__card" data-reveal="fade-up" style={{ '--d': `${i * 50}ms` }}>
            <div className="trend__top">
              <strong className="trend__name">{s.product_name}</strong>
              <span className={`trend__chg ${up ? 'is-up' : 'is-down'}`}>{up ? '▲' : '▼'} {Math.abs(s.change * 100).toFixed(0)}%</span>
            </div>
            <span className="trend__unit">{s.unit}</span>
            <TrendSpark vals={s.vals} up={up} />
            <div className="trend__foot"><span>B/. {s.first.toFixed(2)}</span><strong>B/. {s.last.toFixed(2)}</strong></div>
          </Link>
        )
      })}
    </div>
  )
}
