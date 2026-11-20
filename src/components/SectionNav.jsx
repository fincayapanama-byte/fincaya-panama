// En computadora: pestañas. En celular: un selector desplegable (sin deslizar de lado).
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

export default function SectionNav({ items, label = 'Sección' }) {
  const loc = useLocation(); const nav = useNavigate()
  const cur = [...items].sort((a, b) => b.to.length - a.to.length).find((i) => (i.end ? loc.pathname === i.to : loc.pathname.startsWith(i.to))) || items[0]
  return (
    <>
      <nav className="subnav subnav--desk">
        {items.map((i) => <NavLink key={i.to} end={i.end} to={i.to}>{i.label}</NavLink>)}
      </nav>
      <label className="secnav">
        <span className="secnav__l">{label}</span>
        <select value={cur.to} onChange={(e) => nav(e.target.value)} aria-label={label}>
          {items.map((i) => <option key={i.to} value={i.to}>{i.label}</option>)}
        </select>
      </label>
    </>
  )
}
