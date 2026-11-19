// Compone una imagen para redes: la foto va detrás y el marco de FincaYa (centro transparente) encima.
// Devuelve un File JPG de 1080x1080 listo para subir (Instagram solo acepta JPG).
const loadImg = (src) => new Promise((res, rej) => {
  const i = new Image()
  i.crossOrigin = 'anonymous'
  i.onload = () => res(i)
  i.onerror = () => rej(new Error('No se pudo cargar la imagen'))
  i.src = src
})

export async function composeBrandImage(photo, frameSrc = '/plantilla-redes.png') {
  const S = 1080
  const src = photo instanceof Blob ? URL.createObjectURL(photo) : photo
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
  if (photo instanceof Blob) URL.revokeObjectURL(src)
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.88))
  return new File([blob], 'fincaya-redes.jpg', { type: 'image/jpeg' })
}

// Imagen "Precios de hoy": tabla sobre el marco de FincaYa. rows: [{ product_name, price, unit, change }]
export async function composePricesImage(rows, { title = 'Precios de hoy', subtitle = '' } = {}, frameSrc = '/plantilla-redes.png') {
  const S = 1080
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
  const top = py + 140, rowH = (ph - 190) / Math.max(list.length, 1)
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
    let u = String(r.unit || ''); if (u.length > 16) u = u.slice(0, 15) + '…'
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
  return new File([blob], 'precios-hoy.jpg', { type: 'image/jpeg' })
}
