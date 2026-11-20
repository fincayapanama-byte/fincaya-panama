// Recorte de imagen en el navegador: el usuario arrastra y hace zoom; se exporta JPG al tamaño final.
import { useEffect, useRef, useState } from 'react'

const loadImg = (file) => new Promise((res, rej) => {
  const url = URL.createObjectURL(file); const i = new Image()
  i.onload = () => res({ img: i, url }); i.onerror = () => rej(new Error('No se pudo leer la imagen')); i.src = url
})

export default function ImageCropper({ file, aspect = 1, outW = 800, round = false, title = 'Ajusta la foto', onDone, onCancel }) {
  const outH = Math.round(outW / aspect)
  const box = useRef(null)
  const [src, setSrc] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 }) // desplazamiento en px de pantalla
  const [size, setSize] = useState({ w: 320, h: 320 / aspect })
  const drag = useRef(null)

  useEffect(() => { let u; loadImg(file).then(({ img, url }) => { u = url; setSrc(img) }).catch((e) => alert(e.message)); return () => u && URL.revokeObjectURL(u) }, [file])
  useEffect(() => {
    const w = Math.min(560, (box.current?.parentElement?.clientWidth || 360) - 8)
    setSize({ w, h: Math.round(w / aspect) })
  }, [aspect])

  // Escala base para que la imagen cubra el recuadro
  const base = src ? Math.max(size.w / src.width, size.h / src.height) : 1
  const s = base * zoom
  const iw = src ? src.width * s : 0, ih = src ? src.height * s : 0
  const clamp = (p) => ({ x: Math.min(Math.max(p.x, size.w - iw), 0), y: Math.min(Math.max(p.y, size.h - ih), 0) })
  useEffect(() => { if (src) setPos(clamp({ x: (size.w - iw) / 2, y: (size.h - ih) / 2 })) }, [src, size.w]) // centrar al inicio
  useEffect(() => { setPos((p) => clamp(p)) }, [zoom])

  const down = (e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX - pos.x, y: e.clientY - pos.y } }
  const move = (e) => { if (drag.current) setPos(clamp({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y })) }
  const up = () => { drag.current = null }
  const wheel = (e) => setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.0015)))

  const save = async () => {
    const c = document.createElement('canvas'); c.width = outW; c.height = outH
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, outW, outH)
    const k = outW / size.w
    ctx.drawImage(src, pos.x * k, pos.y * k, iw * k, ih * k)
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.88))
    onDone(new File([blob], 'foto.jpg', { type: 'image/jpeg' }))
  }

  return (
    <div className="cropper" role="dialog" aria-modal="true">
      <div className="cropper__card card">
        <p className="cropper__title">{title}</p>
        <p className="muted small">Arrastra la foto para encuadrarla y usa el control para acercar.</p>
        <div ref={box} className={`cropper__frame ${round ? 'is-round' : ''}`} style={{ width: size.w, height: size.h }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel}>
          {src && <img src={src.src} alt="" draggable="false" style={{ width: iw, height: ih, transform: `translate(${pos.x}px, ${pos.y}px)` }} />}
        </div>
        <input className="cropper__zoom" type="range" min="1" max="4" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" />
        <div className="cropper__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
          <button type="button" className="btn btn--fill" onClick={save} disabled={!src}>Usar esta foto</button>
        </div>
      </div>
    </div>
  )
}
