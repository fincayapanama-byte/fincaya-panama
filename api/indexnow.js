// Aviso diario a IndexNow (Bing, Copilot/ChatGPT, Yandex, Seznam) con las URLs del sitemap.
// La clave es pública por diseño: está publicada en /88efb5c80c3815d1b69646a9c0701680.txt
import { SITE } from './_db.js'
const KEY = '88efb5c80c3815d1b69646a9c0701680'

export default async function handler(req, res) {
  const xml = await (await fetch(`${SITE}/sitemap.xml`)).text()
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).slice(0, 10000)
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
  })
  res.status(200).json({ ok: r.ok, status: r.status, submitted: urls.length })
}
