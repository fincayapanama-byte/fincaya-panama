// Utilidades de imagen: cualquier foto (incluidas las HEIC de iPhone y algunos Android) se convierte a JPG.
// Chrome y Android no saben mostrar HEIC: si se sube tal cual, la foto sale en blanco y el marco de redes falla.

// Lee los primeros bytes para reconocer HEIC/HEIF aunque el archivo diga ".jpg"
export async function isHeic(blob) {
  try {
    const b = new Uint8Array(await blob.slice(0, 16).arrayBuffer())
    const brand = String.fromCharCode(...b.slice(8, 12))
    return String.fromCharCode(...b.slice(4, 8)) === 'ftyp' && /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(brand)
  } catch { return false }
}

async function heicToJpeg(blob) {
  const heic2any = (await import('heic2any')).default // solo se descarga cuando hace falta
  const out = await heic2any({ blob, toType: 'image/jpeg', quality: 0.9 })
  return Array.isArray(out) ? out[0] : out
}

// Convierte cualquier foto a JPG (máx. 1600 px). Instagram solo acepta JPG y así las fotos pesan menos.
export async function toJpeg(file, max = 1600, quality = 0.85) {
  let src = file
  if (await isHeic(file)) src = await heicToJpeg(file)
  let bmp
  try { bmp = await createImageBitmap(src) } catch {
    throw new Error('No pudimos leer esta foto. Prueba con otra o envíala como JPG.')
  }
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo convertir la foto'))), 'image/jpeg', quality))
}

// Descarga una foto ya subida y la devuelve como JPG (para reparar fotos HEIC antiguas o enmarcarlas)
export async function urlToJpeg(url) {
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`No se pudo descargar la foto (${r.status})`)
  return toJpeg(await r.blob())
}
