import { toJpeg, urlToJpeg } from './image'
// Compone una imagen para redes: la foto va detrás y el marco de FincaYa (centro transparente) encima.
// Devuelve un File JPG de 1080x1080 listo para subir (Instagram solo acepta JPG).
const fontsReady = async () => { try { await Promise.all(['800 50px Montserrat', '700 32px Inter', '500 20px Inter'].map((f) => document.fonts.load(f))) } catch (_) { /* sin fuentes web, usa Arial */ } }

const loadImg = (src) => new Promise((res, rej) => {
  const i = new Image()
  i.crossOrigin = 'anonymous'
  i.onload = () => res(i)
  i.onerror = () => rej(new Error('No se pudo cargar la imagen'))
  i.src = src
})

export async function composeBrandImage(photo, frameSrc = '/plantilla-redes.png') {
  const S = 1080
  // Siempre pasa por JPG: así las fotos HEIC (que el navegador no sabe abrir) también se enmarcan
  if (!(photo instanceof Blob)) photo = await urlToJpeg(photo)
  else photo = await toJpeg(photo, 2000, 0.92)
  const src = URL.createObjectURL(photo)
  const [img, frame] = await Promise.all([loadImg(src), loadImg(frameSrc)])
  const c = document.createElement('canvas'); c.width = S; c.height = S
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#0B5D3B'; ctx.fillRect(0, 0, S, S)
  // La foto llena la zona útil del marco (aprox. y 190-940), recortada tipo "cover"
  const zx = 0, zy = 180, zw = S, zh = 780
  const r = Math.max(zw / img.width, zh / img.height)
  const w = img.width * r, h = img.height * r
  ctx.drawImage(img, zx + (zw - w) / 2, zy + (zh - h) / 2, w, h)
  ctx.drawImage(frame, 0, 0, S, S)
  URL.revokeObjectURL(src)
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.88))
  return new File([blob], 'fincaya-redes.jpg', { type: 'image/jpeg' })
}

// Imagen "Precios de hoy": tabla sobre el marco de FincaYa. rows: [{ product_name, price, unit, change }]
export async function composePricesImage(rows, { title = 'Precios de hoy', subtitle = '', note = '', file = 'precios-hoy.jpg' } = {}, frameSrc = '/plantilla-redes.png') {
  const S = 1080
  await fontsReady()
  const frame = await loadImg(frameSrc)
  const c = document.createElement('canvas'); c.width = S; c.height = S
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, S); g.addColorStop(0, '#0B5D3B'); g.addColorStop(1, '#14713F')
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S)
  // Panel blanco
  const px = 70, py = 205, pw = S - 140, ph = 640
  ctx.fillStyle = 'rgba(255,255,255,0.96)'
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 28); ctx.fill()
  ctx.fillStyle = '#0B5D3B'; ctx.textAlign = 'center'
  ctx.font = '800 50px Montserrat, Arial, sans-serif'; ctx.fillText(title, S / 2, py + 70)
  ctx.fillStyle = '#4b5563'; ctx.font = '500 28px Inter, Arial, sans-serif'; ctx.fillText(subtitle, S / 2, py + 112)
  const list = rows.slice(0, 8)
  if (note) { ctx.fillStyle = '#9CA3AF'; ctx.font = '600 18px Inter, Arial, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(note, px + pw - 40, py + 140) ; ctx.textAlign = 'center' }
  const top = py + 150, rowH = (ph - 190) / Math.max(list.length, 1)
  list.forEach((r, i) => {
    const y = top + i * rowH + rowH / 2
    if (i % 2 === 0) { ctx.fillStyle = '#F2F6EF'; ctx.fillRect(px + 20, y - rowH / 2 + 4, pw - 40, rowH - 8) }
    ctx.textAlign = 'left'; ctx.fillStyle = '#1f2937'; ctx.font = '700 32px Inter, Arial, sans-serif'
    let name = r.product_name; while (ctx.measureText(name).width > 430 && name.length > 4) name = name.slice(0, -2)
    if (name !== r.product_name) name += '…'
    ctx.fillText(name, px + 40, y + 6)
    ctx.textAlign = 'right'; ctx.fillStyle = '#0B5D3B'; ctx.font = '800 34px Inter, Arial, sans-serif'
    ctx.fillText(`B/. ${Number(r.price).toFixed(2)}`, px + pw - 210, y - 2)
    ctx.fillStyle = '#6b7280'; ctx.font = '500 18px Inter, Arial, sans-serif'
    let u = String(r.unit || ''); if (u.length > 19) u = u.slice(0, 18) + '…'
    ctx.fillText(u, px + pw - 210, y + 21)
    const ch = Number(r.change || 0)
    ctx.fillStyle = ch > 0 ? '#C0392B' : ch < 0 ? '#16803C' : '#6b7280'
    ctx.font = '800 30px Inter, Arial, sans-serif'
    ctx.fillText(`${ch > 0 ? '▲' : ch < 0 ? '▼' : '='} ${(Math.abs(ch) * 100).toFixed(1)}%`, px + pw - 40, y + 8)
  })
  ctx.textAlign = 'center'; ctx.fillStyle = '#6b7280'; ctx.font = '600 22px Inter, Arial, sans-serif'
  ctx.fillText('Fuente: IMA · Todos los precios en fincayapanama.com/precios', S / 2, py + ph - 18)
  ctx.drawImage(frame, 0, 0, S, S)
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9))
  return new File([blob], file, { type: 'image/jpeg' })
}

// Imagen "Tendencia del mes": 6 mini gráficos (precio diario de 30 días) sobre el marco de FincaYa.
// series: [{ product_name, unit, pts: [[fecha, precio]], first, last, change }]
export async function composeTrendImage(series, { title = 'Tendencia del mes', subtitle = '' } = {}, frameSrc = '/plantilla-redes.png') {
  const S = 1080
  await fontsReady()
  const frame = await loadImg(frameSrc)
  const c = document.createElement('canvas'); c.width = S; c.height = S
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, S); g.addColorStop(0, '#0B5D3B'); g.addColorStop(1, '#14713F')
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S)
  const px = 70, py = 205, pw = S - 140, ph = 640
  ctx.fillStyle = 'rgba(255,255,255,0.97)'; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 28); ctx.fill()
  ctx.textAlign = 'center'; ctx.fillStyle = '#0B5D3B'; ctx.font = '800 46px Montserrat, Arial, sans-serif'; ctx.fillText(title, S / 2, py + 62)
  ctx.fillStyle = '#4b5563'; ctx.font = '500 24px Inter, Arial, sans-serif'; ctx.fillText(subtitle, S / 2, py + 98)
  const list = series.slice(0, 6)
  const cols = 2, gap = 16, gx = px + 24, gy = py + 122, gw = pw - 48, gh = ph - 122 - 46
  const cw = (gw - gap) / cols, chh = (gh - gap * 2) / 3
  list.forEach((s, i) => {
    const x = gx + (i % cols) * (cw + gap), y = gy + Math.floor(i / cols) * (chh + gap)
    ctx.fillStyle = '#F2F6EF'; ctx.beginPath(); ctx.roundRect(x, y, cw, chh, 16); ctx.fill()
    const up = s.change > 0.005, down = s.change < -0.005
    const col = up ? '#C0392B' : down ? '#16803C' : '#6b7280'
    // Nombre y unidad
    ctx.textAlign = 'left'; ctx.fillStyle = '#1f2937'; ctx.font = '700 25px Inter, Arial, sans-serif'
    let name = s.product_name; while (ctx.measureText(name).width > cw - 175 && name.length > 4) name = name.slice(0, -2)
    if (name !== s.product_name) name += '…'
    ctx.fillText(name, x + 18, y + 34)
    ctx.fillStyle = '#6b7280'; ctx.font = '500 16px Inter, Arial, sans-serif'
    let u = String(s.unit || ''); if (u.length > 26) u = u.slice(0, 25) + '…'
    ctx.fillText(u, x + 18, y + 56)
    // Variación del mes
    ctx.textAlign = 'right'; ctx.fillStyle = col; ctx.font = '800 26px Inter, Arial, sans-serif'
    ctx.fillText(`${up ? '▲' : down ? '▼' : '='} ${(Math.abs(s.change) * 100).toFixed(0)}%`, x + cw - 18, y + 34)
    ctx.fillStyle = '#0B5D3B'; ctx.font = '800 20px Inter, Arial, sans-serif'
    ctx.fillText(`B/. ${s.last.toFixed(2)}`, x + cw - 18, y + 58)
    // Línea del mes
    const lx = x + 18, ly = y + 72, lw = cw - 36, lh = chh - 92
    const vals = s.pts.map((p) => p[1]); const mn = Math.min(...vals), mx = Math.max(...vals), rg = mx - mn || mx * 0.05 || 1
    const t0 = Date.parse(s.pts[0][0]), t1 = Date.parse(s.pts[s.pts.length - 1][0]) || t0 + 1
    const P = s.pts.map(([d, v]) => [lx + ((Date.parse(d) - t0) / Math.max(t1 - t0, 1)) * lw, ly + lh - ((v - mn) / rg) * lh])
    const area = ctx.createLinearGradient(0, ly, 0, ly + lh); area.addColorStop(0, col + '33'); area.addColorStop(1, col + '00')
    ctx.beginPath(); P.forEach(([a, b], k) => (k ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.lineTo(P[P.length - 1][0], ly + lh); ctx.lineTo(P[0][0], ly + lh); ctx.closePath(); ctx.fillStyle = area; ctx.fill()
    ctx.beginPath(); P.forEach(([a, b], k) => (k ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()
    const [ex, ey] = P[P.length - 1]; ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke()
    ctx.textAlign = 'left'; ctx.fillStyle = '#9CA3AF'; ctx.font = '500 14px Inter, Arial, sans-serif'; ctx.fillText(`B/. ${s.first.toFixed(2)}`, lx, ly + lh + 16)
  })
  ctx.textAlign = 'center'; ctx.fillStyle = '#6b7280'; ctx.font = '600 20px Inter, Arial, sans-serif'
  ctx.fillText('Precio diario de los últimos 30 días · Fuente: IMA · fincayapanama.com/precios', S / 2, py + ph - 16)
  ctx.drawImage(frame, 0, 0, S, S)
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9))
  return new File([blob], 'tendencia-mes.jpg', { type: 'image/jpeg' })
}
