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
