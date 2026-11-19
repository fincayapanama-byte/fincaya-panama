// Supabase Edge Function: avisa a Bing/IndexNow de URLs nuevas. Llamar con { urls: [...] } o desde un cron diario.
// Secrets: INDEXNOW_KEY (y subir public/<KEY>.txt con la misma clave), SITE_URL
const env = (k: string) => Deno.env.get(k) ?? ''
Deno.serve(async (req) => {
  const { urls = [] } = await req.json().catch(() => ({}))
  if (!urls.length) return Response.json({ ok: false, reason: 'sin urls' }, { status: 400 })
  const host = new URL(env('SITE_URL')).host
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, key: env('INDEXNOW_KEY'), keyLocation: `${env('SITE_URL')}/${env('INDEXNOW_KEY')}.txt`, urlList: urls }),
  })
  return Response.json({ ok: r.ok, status: r.status })
})
