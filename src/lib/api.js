// Capa de datos única: Supabase si hay credenciales, si no MODO DEMO (localStorage).
import { createClient } from '@supabase/supabase-js'
import * as seed from './demoData'
import { slugify } from './config'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const DEMO = !URL || !KEY
export const supabase = DEMO ? null : createClient(URL, KEY)

// =============================== DEMO ===============================
const STORE_KEY = 'agro-demo-v2'
const SESSION_KEY = 'agro-demo-session'
const clone = (x) => JSON.parse(JSON.stringify(x))
let mem = null
const load = () => {
  if (mem) return mem
  try { mem = JSON.parse(localStorage.getItem(STORE_KEY)) } catch { mem = null }
  if (!mem) mem = clone(seed)
  return mem
}
const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(mem)) } catch { /* sin storage */ } }
const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 9)}`
const listeners = new Set()
const emit = (u) => listeners.forEach((fn) => fn(u))
let demoUser = null
try { demoUser = JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { /* */ }

export const resetDemo = () => { mem = clone(seed); save() }

const withFarm = (l) => {
  const db = load()
  return { ...l, farm: db.farms.find((f) => f.id === l.farm_id), category: db.categories.find((c) => c.slug === l.category_slug) }
}
const matchCat = (l, cat) => {
  if (!cat) return true
  if (l.category_slug === cat) return true
  const c = load().categories.find((x) => x.slug === l.category_slug)
  return c?.parent_slug === cat
}

// ============================ helpers SB ============================
const ok = ({ data, error }) => { if (error) throw error; return data }
const SEL = '*, farm:farms(*), category:categories(*)'
const childSlugs = async (cat) => {
  const cats = await api.categories()
  const kids = cats.filter((c) => c.parent_slug === cat).map((c) => c.slug)
  return kids.length ? [cat, ...kids] : [cat]
}


// Convierte cualquier foto a JPG (máx. 1600 px). Instagram solo acepta JPG y así las fotos pesan menos.
export async function toJpeg(file, max = 1600, quality = 0.85) {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(bmp, 0, 0, c.width, c.height)
    return await new Promise((res) => c.toBlob((b) => res(b || file), 'image/jpeg', quality))
  } catch { return file }
}

function summarizePrices(rows) {
  const by = {}
  for (const p of rows || []) {
    const k = `${p.product_slug}|${p.unit}|${p.province || ''}|${p.market || ''}|${p.source}`
    ;(by[k] ||= []).push(p)
  }
  return Object.values(by).map((g) => {
    const s = g.sort((a, b) => a.date.localeCompare(b.date))
    const last = s.at(-1), prev = s.at(-2)
    return { ...last, values: s.map((x) => Number(x.price)), change: prev ? (last.price - prev.price) / prev.price : 0 }
  }).sort((a, b) => a.product_name.localeCompare(b.product_name))
}

export const api = {
  // ---------------- Auth ----------------
  async currentUser() {
    if (DEMO) return demoUser
    const { data } = await supabase.auth.getUser()
    if (!data.user) return null
    const prof = ok(await supabase.from('profiles').select('*').eq('id', data.user.id).single())
    return { ...prof, email: data.user.email }
  },
  onAuth(fn) {
    if (DEMO) { listeners.add(fn); return () => listeners.delete(fn) }
    const { data } = supabase.auth.onAuthStateChange(async () => fn(await api.currentUser()))
    return () => data.subscription.unsubscribe()
  },
  async demoLogin(id) {
    demoUser = load().profiles.find((p) => p.id === id) || null
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(demoUser)) } catch { /* */ }
    emit(demoUser); return demoUser
  },
  async signIn(email, password) {
    if (DEMO) {
      const p = load().profiles.find((x) => x.email === email)
      if (!p) throw new Error('En modo demo usa los botones de acceso rápido.')
      return api.demoLogin(p.id)
    }
    ok(await supabase.auth.signInWithPassword({ email, password }))
  },
  async signUp({ email, password, full_name, phone }) {
    if (DEMO) {
      const p = { id: uid('u'), email, full_name, whatsapp: phone, role: 'productor', blocked: false, created_at: new Date().toISOString() }
      load().profiles.push(p); save(); return api.demoLogin(p.id)
    }
    ok(await supabase.auth.signUp({ email, password, options: { data: { full_name, phone } } }))
  },
  async signOut() {
    if (DEMO) { demoUser = null; try { localStorage.removeItem(SESSION_KEY) } catch { /* */ } emit(null); return }
    await supabase.auth.signOut()
  },

  // ---------------- Público ----------------
  async categories() {
    if (DEMO) return load().categories
    return ok(await supabase.from('categories').select('*').order('sort'))
  },
  async listings({ category, province, q, featured, limit = 60, sort = 'recent' } = {}) {
    if (DEMO) {
      let r = load().listings.filter((l) => l.status === 'aprobado')
        .filter((l) => matchCat(l, category))
        .filter((l) => !province || l.province === province)
        .filter((l) => !featured || l.featured)
        .filter((l) => !q || `${l.title} ${l.breed || ''} ${l.description || ''} ${l.district || ''}`.toLowerCase().includes(q.toLowerCase()))
      r.sort((a, b) => sort === 'price' ? (a.price ?? 1e9) - (b.price ?? 1e9) : (b.featured - a.featured) || b.created_at.localeCompare(a.created_at))
      return r.slice(0, limit).map(withFarm)
    }
    let qb = supabase.from('listings').select(SEL).eq('status', 'aprobado').limit(limit)
    if (category) qb = qb.in('category_slug', await childSlugs(category))
    if (province) qb = qb.eq('province', province)
    if (featured) qb = qb.eq('featured', true)
    if (q) qb = qb.or(`title.ilike.%${q}%,breed.ilike.%${q}%,description.ilike.%${q}%`)
    qb = sort === 'price' ? qb.order('price', { ascending: true }) : qb.order('featured', { ascending: false }).order('created_at', { ascending: false })
    return ok(await qb)
  },
  async listing(slug) {
    if (DEMO) { const l = load().listings.find((x) => x.slug === slug); return l ? withFarm(l) : null }
    return ok(await supabase.from('listings').select(SEL).eq('slug', slug).maybeSingle())
  },
  async farm(slug) {
    if (DEMO) {
      const db = load(); const f = db.farms.find((x) => x.slug === slug)
      if (!f) return null
      return { ...f, listings: db.listings.filter((l) => l.farm_id === f.id && l.status === 'aprobado').map(withFarm) }
    }
    const f = ok(await supabase.from('farms').select('*').eq('slug', slug).maybeSingle())
    if (!f) return null
    f.listings = ok(await supabase.from('listings').select(SEL).eq('farm_id', f.id).eq('status', 'aprobado').order('created_at', { ascending: false }))
    return f
  },
  // Fincas con ubicación para el mapa. Si la finca no marcó actividades, se deducen de sus anuncios.
  async mapFarms() {
    const cats = await api.categories()
    const rootOf = (slug) => { const c = cats.find((x) => x.slug === slug); return c?.parent_slug || slug }
    let farms, ls
    if (DEMO) {
      const db = load(); farms = db.farms.filter((f) => f.lat != null && f.show_on_map !== false)
      ls = db.listings.filter((l) => l.status === 'aprobado')
    } else {
      farms = ok(await supabase.from('farms').select('id,slug,name,lat,lng,district,province,logo_url,verified,activities,show_on_map').not('lat', 'is', null)) || []
      farms = farms.filter((f) => f.show_on_map !== false)
      ls = ok(await supabase.from('listings').select('farm_id,category_slug').eq('status', 'aprobado')) || []
    }
    return farms.map((f) => {
      const fromListings = [...new Set(ls.filter((l) => l.farm_id === f.id).map((l) => rootOf(l.category_slug)))]
      return { ...f, activities: f.activities?.length ? f.activities : fromListings }
    })
  },
  async farms({ province } = {}) {
    if (DEMO) return load().farms.filter((f) => !province || f.province === province)
    let qb = supabase.from('farms').select('*').order('verified', { ascending: false }).order('created_at', { ascending: false })
    if (province) qb = qb.eq('province', province)
    return ok(await qb)
  },
  // Devuelve un resumen por producto: último precio, variación y serie para la tendencia
  async prices({ days = 30, market = null } = {}) {
    const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10)
    if (DEMO) return summarizePrices(load().prices.filter((p) => p.approved && p.date >= since && (!market || p.market === market)))
    const rows = ok(await supabase.rpc('prices_summary', { p_days: days, p_market: market }))
    return (rows || []).map((r) => ({
      ...r,
      values: (r.series || []).map(Number),
      change: r.prev_price ? (Number(r.price) - Number(r.prev_price)) / Number(r.prev_price) : 0,
    }))
  },
  // Historial completo de un mercado (con fechas), para comparar semanas y graficar tendencias
  async priceHistory({ market = 'Merca Panamá', days = 35 } = {}) {
    const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10)
    if (DEMO) return load().prices.filter((p) => p.approved && p.date >= since && p.market === market)
    const out = []
    for (let from = 0; from < 20000; from += 1000) {
      const rows = ok(await supabase.from('prices').select('product_slug,product_name,unit,price,date,source')
        .eq('approved', true).eq('market', market).eq('source', 'IMA').gte('date', since)
        .order('date', { ascending: true }).order('product_slug').range(from, from + 999)) || []
      out.push(...rows)
      if (rows.length < 1000) break
    }
    return out
  },
  // Historial de un producto (todas las fuentes y mercados)
  async productPrices(slug, { days = 60 } = {}) {
    const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10)
    if (DEMO) return load().prices.filter((p) => p.approved && p.product_slug === slug && p.date >= since).sort((a, b) => b.date.localeCompare(a.date))
    return ok(await supabase.from('prices').select('product_slug,product_name,unit,price,price_min,price_max,market,origin,source,source_url,date')
      .eq('product_slug', slug).eq('approved', true).gte('date', since).order('date', { ascending: false }).limit(2000)) || []
  },
  async priceMarkets({ days = 30 } = {}) {
    if (DEMO) {
      const by = {}
      for (const p of load().prices) if (p.market) by[p.market] = (by[p.market] || 0) + 1
      return Object.entries(by).map(([market, n]) => ({ market, n })).sort((a, b) => b.n - a.n)
    }
    return ok(await supabase.rpc('price_markets', { p_days: days })) || []
  },
  async ads(placement) {
    if (DEMO) return load().ad_slots.filter((a) => a.active && a.placement === placement)
    return ok(await supabase.from('ad_slots').select('*').eq('active', true).eq('placement', placement))
  },
  async track(listingId, kind) {
    if (DEMO) { const l = load().listings.find((x) => x.id === listingId); if (l) { l[kind === 'view' ? 'views' : 'contacts']++; save() } return }
    await supabase.rpc('track_listing', { p_id: listingId, p_kind: kind })
  },
  async report(listingId, reason, details) {
    if (DEMO) { load().reports.push({ id: uid('r'), listing_id: listingId, reason, details, status: 'abierto', created_at: new Date().toISOString() }); save(); return }
    ok(await supabase.from('reports').insert({ listing_id: listingId, reason, details }))
  },

  // ---------------- Favoritos (en el navegador si no hay sesión o en demo) ----------------
  async favoriteIds(user) {
    if (DEMO || !user) { try { return JSON.parse(localStorage.getItem('agro-favs')) || [] } catch { return [] } }
    return ok(await supabase.from('favorites').select('listing_id')).map((r) => r.listing_id)
  },
  async toggleFavorite(user, listingId) {
    const ids = await api.favoriteIds(user)
    const on = !ids.includes(listingId)
    if (DEMO || !user) {
      const next = on ? [...ids, listingId] : ids.filter((x) => x !== listingId)
      try { localStorage.setItem('agro-favs', JSON.stringify(next)) } catch { /* */ }
      return on
    }
    if (on) ok(await supabase.from('favorites').insert({ user_id: user.id, listing_id: listingId }))
    else ok(await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listingId))
    return on
  },
  async favoriteListings(user) {
    const ids = await api.favoriteIds(user)
    if (!ids.length) return []
    if (DEMO) return load().listings.filter((l) => ids.includes(l.id)).map(withFarm)
    return ok(await supabase.from('listings').select(SEL).in('id', ids))
  },
  async provinceCounts() {
    const rows = DEMO ? load().listings.filter((l) => l.status === 'aprobado') : ok(await supabase.from('listings').select('province').eq('status', 'aprobado'))
    return rows.reduce((m, r) => ({ ...m, [r.province]: (m[r.province] || 0) + 1 }), {})
  },

  // ---------------- Productor ----------------
  async myFarm(user) {
    if (DEMO) return load().farms.find((f) => f.owner_id === user.id) || null
    return ok(await supabase.from('farms').select('*').eq('owner_id', user.id).maybeSingle())
  },
  async saveFarm(user, farm) {
    const { listings: _l, ...clean } = farm
    for (const k of ['name', 'district', 'address', 'instagram', 'tiktok', 'facebook', 'website', 'email']) if (typeof clean[k] === 'string') clean[k] = clean[k].trim()
    const row = { ...clean, owner_id: user.id, slug: farm.slug || `${slugify(farm.name)}-${Math.random().toString(36).slice(2, 6)}` }
    if (DEMO) {
      const db = load(); const i = db.farms.findIndex((f) => f.id === farm.id)
      if (i >= 0) db.farms[i] = { ...db.farms[i], ...row }
      else db.farms.push({ ...row, id: uid('f'), verified: false, created_at: new Date().toISOString() })
      save(); return api.myFarm(user)
    }
    delete row.verified
    return ok(await supabase.from('farms').upsert(row).select().single())
  },
  async myListings(user) {
    if (DEMO) return load().listings.filter((l) => l.owner_id === user.id).map(withFarm).sort((a, b) => b.created_at.localeCompare(a.created_at))
    return ok(await supabase.from('listings').select(SEL).eq('owner_id', user.id).order('created_at', { ascending: false }))
  },
  async uploadImage(user, file) {
    const jpg = await toJpeg(file)
    if (DEMO) return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(jpg) })
    const path = `${user.id}/${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ''))}.jpg`
    ok(await supabase.storage.from('fotos').upload(path, jpg, { cacheControl: '31536000', contentType: 'image/jpeg' }))
    return supabase.storage.from('fotos').getPublicUrl(path).data.publicUrl
  },
  async createListing(user, farm, l) {
    const row = { ...l, farm_id: farm.id, owner_id: user.id, status: 'pendiente', featured: false,
      province: l.province || farm.province, district: l.district || farm.district,
      slug: `${slugify(`${l.title} ${farm.district || farm.province}`)}-${Math.random().toString(36).slice(2, 7)}` }
    if (DEMO) {
      const full = { ...row, id: uid('l'), views: 0, contacts: 0, created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 864e5).toISOString() }
      load().listings.push(full); save(); return full
    }
    return ok(await supabase.from('listings').insert(row).select().single())
  },
  async updateMyListing(id, patch) {
    if (DEMO) { const l = load().listings.find((x) => x.id === id); Object.assign(l, patch); save(); return l }
    return ok(await supabase.from('listings').update(patch).eq('id', id).select().single())
  },
  async deleteMyListing(id) {
    if (DEMO) { const db = load(); db.listings = db.listings.filter((l) => l.id !== id); save(); return }
    ok(await supabase.from('listings').delete().eq('id', id))
  },
  // ---- Avisos (centro de notificaciones) ----
  async notifications(user) {
    if (DEMO) { const db = load(); return (db.notifications ||= [
      { id: 'n1', kind: 'listing_approved', title: '✅ Tu anuncio fue publicado', body: '"Lechones Landrace de alta genética" ya está visible.', url: '/anuncio/lechones-landrace-penonome-l1', created_at: new Date(Date.now() - 36e5).toISOString() },
      { id: 'n2', kind: 'comment', title: '💬 Comentario en Instagram', body: 'María: ¿Todavía tienen lechones?', url: '/panel/comentarios', created_at: new Date(Date.now() - 864e5).toISOString(), read_at: new Date().toISOString() },
    ]).filter(() => user) }
    return ok(await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(60)) || []
  },
  async unreadCount(user) {
    if (DEMO) return (await api.notifications(user)).filter((n) => !n.read_at).length
    const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null)
    return count || 0
  },
  async markAllRead(user) {
    if (DEMO) { const db = load(); (db.notifications || []).forEach((n) => { n.read_at ||= new Date().toISOString() }); save(); return }
    ok(await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null))
  },
  async vapidKey() {
    const r = await fetch(`${URL}/functions/v1/notify?vapid=1`); return (await r.json()).publicKey
  },
  async savePushSubscription(user, sub) {
    const j = sub.toJSON()
    ok(await supabase.from('push_subscriptions').upsert({ user_id: user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent.slice(0, 200) }, { onConflict: 'endpoint' }))
  },
  async removePushSubscription(endpoint) {
    if (!DEMO) await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  },
  async testNotification() {
    const { data, error } = await supabase.functions.invoke('notify', { body: { event: 'test' } })
    if (error) throw error
    return data
  },
  async myComments(user) {
    if (DEMO) {
      const db = load(); const mine = new Set(db.listings.filter((l) => l.owner_id === user.id).map((l) => l.id))
      return db.comments.filter((c) => mine.has(c.listing_id)).map((c) => ({ ...c, listing: db.listings.find((l) => l.id === c.listing_id) }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
    return ok(await supabase.from('comments').select('*, listing:listings(title, slug)').order('created_at', { ascending: false }))
  },
  async replyComment(id, reply) {
    if (DEMO) { const c = load().comments.find((x) => x.id === id); Object.assign(c, { reply, replied_at: new Date().toISOString() }); save(); return }
    ok(await supabase.from('comments').update({ reply, replied_at: new Date().toISOString() }).eq('id', id))
    // La Edge Function meta-webhook/reply publica la respuesta en la red (Fase 2).
  },
  async reportPrice(user, p) {
    const row = { ...p, created_by: user.id, approved: false, is_reference: false, source: 'Reporte de productores', date: new Date().toISOString().slice(0, 10) }
    if (DEMO) { load().prices.push({ ...row, id: uid('p') }); save(); return }
    ok(await supabase.from('prices').insert(row))
  },

  // ---------------- Admin ----------------
  admin: {
    async stats() {
      if (DEMO) {
        const db = load(); const by = (s) => db.listings.filter((l) => l.status === s).length
        return { users: db.profiles.length, farms: db.farms.length, verified: db.farms.filter((f) => f.verified).length,
          approved: by('aprobado'), pending: by('pendiente'), views: db.listings.reduce((s, l) => s + l.views, 0),
          contacts: db.listings.reduce((s, l) => s + l.contacts, 0), reports: db.reports.filter((r) => r.status === 'abierto').length,
          comments: db.comments.length, unanswered: db.comments.filter((c) => !c.reply).length,
          posts: db.social_posts.filter((p) => p.status === 'publicado').length }
      }
      const count = async (t, f = (q) => q) => (await f(supabase.from(t).select('*', { count: 'exact', head: true }))).count || 0
      const ls = ok(await supabase.from('listings').select('views, contacts'))
      return {
        users: await count('profiles'), farms: await count('farms'), verified: await count('farms', (q) => q.eq('verified', true)),
        approved: await count('listings', (q) => q.eq('status', 'aprobado')), pending: await count('listings', (q) => q.eq('status', 'pendiente')),
        views: ls.reduce((s, l) => s + l.views, 0), contacts: ls.reduce((s, l) => s + l.contacts, 0),
        reports: await count('reports', (q) => q.eq('status', 'abierto')), comments: await count('comments'),
        unanswered: await count('comments', (q) => q.is('reply', null)), posts: await count('social_posts', (q) => q.eq('status', 'publicado')),
      }
    },
    async listings(status) {
      if (DEMO) return load().listings.filter((l) => !status || l.status === status).map(withFarm).sort((a, b) => b.created_at.localeCompare(a.created_at))
      let q = supabase.from('listings').select(SEL).order('created_at', { ascending: false })
      if (status) q = q.eq('status', status)
      return ok(await q)
    },
    async setListing(id, patch, { socialImage } = {}) {
      if (patch.status === 'aprobado') patch.approved_at = new Date().toISOString()
      if (DEMO) {
        const db = load(); const l = db.listings.find((x) => x.id === id); Object.assign(l, patch)
        if (patch.status === 'aprobado' && !db.social_posts.some((p) => p.listing_id === id))
          ['facebook', 'instagram'].forEach((n) => db.social_posts.push({ id: uid('s'), listing_id: id, network: n, status: 'pendiente', created_at: new Date().toISOString() }))
        save(); return
      }
      ok(await supabase.from('listings').update(patch).eq('id', id))
      if (patch.status === 'aprobado') await supabase.functions.invoke('publish-social', { body: { listing_id: id, image_url: socialImage } }).catch(() => {})
    },
    async users() {
      if (DEMO) return load().profiles
      return ok(await supabase.from('profiles').select('*').order('created_at', { ascending: false }))
    },
    async setUser(id, patch) {
      if (DEMO) { Object.assign(load().profiles.find((p) => p.id === id), patch); save(); return }
      ok(await supabase.from('profiles').update(patch).eq('id', id))
    },
    async farms() { return api.farms() },
    async setFarm(id, patch) {
      if (DEMO) { Object.assign(load().farms.find((f) => f.id === id), patch); save(); return }
      ok(await supabase.from('farms').update(patch).eq('id', id))
    },
    async prices() {
      if (DEMO) return [...load().prices].sort((a, b) => b.date.localeCompare(a.date))
      return ok(await supabase.from('prices').select('*').order('date', { ascending: false }).limit(300))
    },
    async savePrice(p) {
      if (DEMO) {
        const db = load(); const i = db.prices.findIndex((x) => x.id === p.id)
        if (i >= 0) db.prices[i] = { ...db.prices[i], ...p }; else db.prices.push({ ...p, id: uid('p'), approved: true })
        save(); return
      }
      ok(await supabase.from('prices').upsert({ approved: true, ...p }))
    },
    async deletePrice(id) {
      if (DEMO) { const db = load(); db.prices = db.prices.filter((p) => p.id !== id); save(); return }
      ok(await supabase.from('prices').delete().eq('id', id))
    },
    async ads() {
      if (DEMO) return load().ad_slots
      return ok(await supabase.from('ad_slots').select('*').order('created_at', { ascending: false }))
    },
    async saveAd(a) {
      if (DEMO) {
        const db = load(); const i = db.ad_slots.findIndex((x) => x.id === a.id)
        if (i >= 0) db.ad_slots[i] = { ...db.ad_slots[i], ...a }; else db.ad_slots.push({ impressions: 0, clicks: 0, ...a, id: uid('a') })
        save(); return
      }
      ok(await supabase.from('ad_slots').upsert(a))
    },
    async reports() {
      if (DEMO) { const db = load(); return db.reports.map((r) => ({ ...r, listing: db.listings.find((l) => l.id === r.listing_id) })) }
      return ok(await supabase.from('reports').select('*, listing:listings(title, slug)').order('created_at', { ascending: false }))
    },
    async resolveReport(id) {
      if (DEMO) { load().reports.find((r) => r.id === id).status = 'resuelto'; save(); return }
      ok(await supabase.from('reports').update({ status: 'resuelto' }).eq('id', id))
    },
    async social() {
      if (DEMO) { const db = load(); return db.social_posts.map((p) => ({ ...p, listing: db.listings.find((l) => l.id === p.listing_id) })).sort((a, b) => b.created_at.localeCompare(a.created_at)) }
      return ok(await supabase.from('social_posts').select('*, listing:listings(title, slug)').order('created_at', { ascending: false }))
    },
    async publishNow(listingId, socialImage) {
      if (DEMO) { load().social_posts.filter((p) => p.listing_id === listingId).forEach((p) => { p.status = 'publicado'; p.permalink = '#' }); save(); return }
      ok(await supabase.functions.invoke('publish-social', { body: { listing_id: listingId, image_url: socialImage } }))
    },
    async syncIma(days = 2) {
      if (DEMO) return { ok: true, days, upserted: 0, detail: { demo: 'En modo demo no se consulta el IMA' } }
      const { data, error } = await supabase.functions.invoke('sync-precios-ima', { body: { days } })
      if (error) throw error
      return data
    },
    async syncLog() {
      if (DEMO) return []
      return ok(await supabase.from('price_sync_log').select('*').order('ran_at', { ascending: false }).limit(5))
    },
    async brandPosts() {
      if (DEMO) return load().brand_posts || []
      return ok(await supabase.from('brand_posts').select('*').order('created_at', { ascending: false }).limit(50))
    },
    async publishBrand({ message, image_url, networks }) {
      if (DEMO) {
        const db = load(); db.brand_posts = db.brand_posts || []
        const results = Object.fromEntries(networks.map((n) => [n, n === 'instagram' && !image_url ? 'error: Instagram requiere una imagen' : 'publicado (demo)']))
        db.brand_posts.unshift({ id: uid('b'), message, image_url, networks, results, created_at: new Date().toISOString() }); save()
        return { ok: true, results }
      }
      const { data, error } = await supabase.functions.invoke('publish-social', { body: { brand: { message, image_url, networks } } })
      if (error) throw error
      return data
    },
    async comments() {
      if (DEMO) { const db = load(); return db.comments.map((c) => ({ ...c, listing: db.listings.find((l) => l.id === c.listing_id) })) }
      return ok(await supabase.from('comments').select('*, listing:listings(title, slug)').order('created_at', { ascending: false }))
    },
  },
}
