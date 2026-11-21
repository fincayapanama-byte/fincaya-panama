// Animaciones de entrada al hacer scroll. Cualquier elemento con data-reveal="fade-up|scale-in|blur-in|slide-left|slide-right"
// aparece cuando entra en pantalla. Sin JS (o para bots) el contenido se ve normal.
export function initReveal() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  document.documentElement.classList.add('js-reveal')
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target) }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
  const scan = () => document.querySelectorAll('[data-reveal]:not(.revealed):not([data-rv])').forEach((el) => { el.setAttribute('data-rv', ''); io.observe(el) })
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true })
  scan()
}
