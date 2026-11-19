// Datos de ejemplo para MODO DEMO (sin Supabase). Fincas marcadas "(demo)" son ficticias.
const today = new Date()
const daysAgo = (n) => new Date(today.getTime() - n * 864e5).toISOString()
const dateAgo = (n) => daysAgo(n).slice(0, 10)

export const categories = [
  {
    slug: "ganaderia",
    name: "Ganadería",
    parent_slug: null,
    sort: 1
  },
  {
    slug: "novillos",
    name: "Novillos",
    parent_slug: "ganaderia",
    sort: 1
  },
  {
    slug: "vacas",
    name: "Vacas",
    parent_slug: "ganaderia",
    sort: 2
  },
  {
    slug: "toros",
    name: "Toros",
    parent_slug: "ganaderia",
    sort: 3
  },
  {
    slug: "terneros",
    name: "Terneros",
    parent_slug: "ganaderia",
    sort: 4
  },
  {
    slug: "equinos",
    name: "Caballos y equinos",
    parent_slug: "ganaderia",
    sort: 5
  },
  {
    slug: "porcicultura",
    name: "Porcicultura",
    parent_slug: null,
    sort: 2
  },
  {
    slug: "lechones",
    name: "Lechones",
    parent_slug: "porcicultura",
    sort: 1
  },
  {
    slug: "cerdas-madres",
    name: "Cerdas madres",
    parent_slug: "porcicultura",
    sort: 2
  },
  {
    slug: "padrotes",
    name: "Padrotes",
    parent_slug: "porcicultura",
    sort: 3
  },
  {
    slug: "cerdos-engorde",
    name: "Cerdos de engorde",
    parent_slug: "porcicultura",
    sort: 4
  },
  {
    slug: "avicultura",
    name: "Avicultura",
    parent_slug: null,
    sort: 3
  },
  {
    slug: "pollos",
    name: "Pollos de engorde",
    parent_slug: "avicultura",
    sort: 1
  },
  {
    slug: "gallinas",
    name: "Gallinas ponedoras",
    parent_slug: "avicultura",
    sort: 2
  },
  {
    slug: "otras-aves",
    name: "Patos, pavos y otras aves",
    parent_slug: "avicultura",
    sort: 3
  },
  {
    slug: "ovinocultura",
    name: "Ovinocultura y caprinos",
    parent_slug: null,
    sort: 4
  },
  {
    slug: "ovejas",
    name: "Ovejas",
    parent_slug: "ovinocultura",
    sort: 1
  },
  {
    slug: "cabras",
    name: "Cabras",
    parent_slug: "ovinocultura",
    sort: 2
  },
  {
    slug: "agricultura",
    name: "Agricultura",
    parent_slug: null,
    sort: 5
  },
  {
    slug: name,
    name: "Ñame",
    parent_slug: "agricultura",
    sort: 1
  },
  {
    slug: "yuca",
    name: "Yuca",
    parent_slug: "agricultura",
    sort: 2
  },
  {
    slug: "otoe",
    name: "Otoe",
    parent_slug: "agricultura",
    sort: 3
  },
  {
    slug: "granos",
    name: "Arroz, maíz y frijol",
    parent_slug: "agricultura",
    sort: 4
  },
  {
    slug: "frutas",
    name: "Frutas",
    parent_slug: "agricultura",
    sort: 5
  },
  {
    slug: "hortalizas",
    name: "Hortalizas",
    parent_slug: "agricultura",
    sort: 6
  },
  {
    slug: "insumos",
    name: "Insumos",
    parent_slug: null,
    sort: 6
  },
  {
    slug: "alimento-animal",
    name: "Alimento animal",
    parent_slug: "insumos",
    sort: 1
  },
  {
    slug: "fertilizantes",
    name: "Fertilizantes y agroquímicos",
    parent_slug: "insumos",
    sort: 2
  },
  {
    slug: "semillas",
    name: "Semillas y plantones",
    parent_slug: "insumos",
    sort: 3
  },
  {
    slug: "veterinarios",
    name: "Productos veterinarios",
    parent_slug: "insumos",
    sort: 4
  },
  {
    slug: "maquinaria",
    name: "Maquinaria y equipos",
    parent_slug: null,
    sort: 7
  },
  {
    slug: "tractores",
    name: "Tractores",
    parent_slug: "maquinaria",
    sort: 1
  },
  {
    slug: "implementos",
    name: "Implementos",
    parent_slug: "maquinaria",
    sort: 2
  },
  {
    slug: "equipos",
    name: "Equipos y herramientas",
    parent_slug: "maquinaria",
    sort: 3
  },
  {
    slug: "servicios",
    name: "Servicios",
    parent_slug: null,
    sort: 8
  },
  {
    slug: "servicio-veterinario",
    name: "Veterinaria",
    parent_slug: "servicios",
    sort: 1
  },
  {
    slug: "transporte",
    name: "Transporte de ganado y carga",
    parent_slug: "servicios",
    sort: 2
  },
  {
    slug: "mano-de-obra",
    name: "Mano de obra",
    parent_slug: "servicios",
    sort: 3
  },
  {
    slug: "asesoria",
    name: "Asesoría técnica",
    parent_slug: "servicios",
    sort: 4
  },
  {
    slug: "fincas-propiedades",
    name: "Fincas y propiedades",
    parent_slug: null,
    sort: 9
  },
  {
    slug: "venta-fincas",
    name: "Fincas en venta",
    parent_slug: "fincas-propiedades",
    sort: 1
  },
  {
    slug: "alquiler-fincas",
    name: "Fincas en alquiler",
    parent_slug: "fincas-propiedades",
    sort: 2
  }
]

export const profiles = [
  { id: 'u-admin', full_name: 'Administrador', email: 'admin@demo.pa', role: 'admin', blocked: false, created_at: daysAgo(40) },
  { id: 'u-navas', full_name: 'Finca Navas', email: 'navasfinca@gmail.com', whatsapp: '50760359444', role: 'productor', blocked: false, created_at: daysAgo(20) },
  { id: 'u-roble', full_name: 'Productor demo 1', email: 'roble@demo.pa', role: 'productor', blocked: false, created_at: daysAgo(15) },
  { id: 'u-sol', full_name: 'Productor demo 2', email: 'sol@demo.pa', role: 'productor', blocked: false, created_at: daysAgo(6) },
]

export const farms = [
  { id: 'f-navas', owner_id: 'u-navas', slug: 'finca-navas', name: 'Finca Navas', province: 'Coclé', district: 'Penonomé',
    address: 'Vía a Las Minas, Santa Cruz', lat: 8.652317, lng: -80.354509, whatsapp: '50760359444', phone: '+507 6035-9444',
    email: 'navasfinca@gmail.com', instagram: 'fincanavas_panama', tiktok: 'fincanavas_panama', website: 'https://fincanavas.com',
    description: 'Finca familiar con cerdas madres y padrote Landrace de alta genética, y cultivo de ñame. Registro de cada camada y cada cosecha.',
    cover_url: '/demo/hero.jpg', verified: false, created_at: daysAgo(20) },
  { id: 'f-roble', owner_id: 'u-roble', slug: 'finca-el-roble-demo', name: 'Finca El Roble (demo)', province: 'Chiriquí', district: 'Bugaba',
    whatsapp: '50760000001', description: 'Ganado de doble propósito y terneros destetados. Finca de ejemplo.', cover_url: '/demo/sacos.jpg',
    verified: false, created_at: daysAgo(15) },
  { id: 'f-sol', owner_id: 'u-sol', slug: 'granja-el-sol-demo', name: 'Granja El Sol (demo)', province: 'Herrera', district: 'Chitré',
    whatsapp: '50760000002', description: 'Pollos de engorde y gallinas ponedoras. Finca de ejemplo.', cover_url: '/demo/pintos.jpg',
    verified: false, created_at: daysAgo(6) },
]

const L = (o) => ({ status: 'aprobado', featured: false, views: 0, contacts: 0, unit: 'unidad', images: [],
  expires_at: new Date(today.getTime() + 25 * 864e5).toISOString(), ...o })

export const listings = [
  L({ id: 'l1', farm_id: 'f-navas', owner_id: 'u-navas', slug: 'lechones-landrace-penonome-l1', category_slug: 'lechones',
    title: 'Lechones Landrace de alta genética', breed: 'Landrace', price: 85, unit: 'unidad', quantity: 12,
    province: 'Coclé', district: 'Penonomé', images: ['/demo/lechones.jpg', '/demo/pintos.jpg'], featured: true, views: 214, contacts: 19,
    description: 'Destetados, vacunados y desparasitados. Ideales para engorde o cría. Entrega en Coclé o retiro en finca.',
    created_at: daysAgo(2), approved_at: daysAgo(2) }),
  L({ id: 'l2', farm_id: 'f-navas', owner_id: 'u-navas', slug: 'name-por-quintal-penonome-l2', category_slug: 'name',
    title: 'Ñame fresco por quintal', price: 38, unit: 'quintal', quantity: 60, province: 'Coclé', district: 'Penonomé',
    images: ['/demo/name.jpg', '/demo/sacos.jpg'], featured: true, views: 98, contacts: 7,
    description: 'Ñame de primera, cosecha de la semana. Al por mayor y detal.', created_at: daysAgo(3), approved_at: daysAgo(3) }),
  L({ id: 'l3', farm_id: 'f-navas', owner_id: 'u-navas', slug: 'cerda-madre-landrace-l3', category_slug: 'cerdas-madres',
    title: 'Cerda madre Landrace primeriza', breed: 'Landrace', price: 450, unit: 'cabeza', quantity: 1,
    province: 'Coclé', district: 'Penonomé', images: ['/demo/cerda.jpg'], views: 61, contacts: 4,
    description: 'Hembra de reemplazo con registro de vacunas. Ejemplo de anuncio.', created_at: daysAgo(5), approved_at: daysAgo(5) }),
  L({ id: 'l4', farm_id: 'f-roble', owner_id: 'u-roble', slug: 'terneros-destetados-bugaba-l4', category_slug: 'terneros',
    title: 'Terneros destetados (demo)', breed: 'Brahman cruzado', price: 1.35, unit: 'libra', quantity: 8,
    province: 'Chiriquí', district: 'Bugaba', images: ['/demo/hero.jpg'], views: 40, contacts: 2,
    description: 'Anuncio de ejemplo. Precio por libra en pie.', created_at: daysAgo(1), approved_at: daysAgo(1) }),
  L({ id: 'l5', farm_id: 'f-sol', owner_id: 'u-sol', slug: 'gallinas-ponedoras-chitre-l5', category_slug: 'gallinas',
    title: 'Gallinas ponedoras en producción (demo)', price: 9, unit: 'unidad', quantity: 50,
    province: 'Herrera', district: 'Chitré', images: ['/demo/pintos.jpg'], views: 22, contacts: 1,
    description: 'Anuncio de ejemplo.', created_at: daysAgo(4), approved_at: daysAgo(4) }),
  L({ id: 'l6', farm_id: 'f-sol', owner_id: 'u-sol', slug: 'pollos-engorde-chitre-l6', category_slug: 'pollos',
    title: 'Pollos de engorde listos (demo)', price: 1.2, unit: 'libra', quantity: 200, status: 'pendiente',
    province: 'Herrera', district: 'Chitré', images: [], description: 'Anuncio de ejemplo pendiente de revisión.',
    created_at: daysAgo(0) }),
]

// Precios de ejemplo: valores ilustrativos, NO reales. Reemplazar con fuentes reales (ver plan).
const P = (product_slug, product_name, unit, price, source, n, extra = {}) => ({
  id: `p-${product_slug}-${n}`, product_slug, product_name, unit, price, source, date: dateAgo(n),
  approved: true, is_reference: source.startsWith('Plataforma'), province: extra.province || null, market: extra.market || null })

export const prices = [
  ...[6, 5, 4, 3, 2, 1, 0].map((n, i) => P('lechones', 'Lechón destetado', 'unidad', [80, 82, 82, 84, 85, 85, 86][i], 'Plataforma (referencia)', n, { province: 'Coclé' })),
  ...[6, 5, 4, 3, 2, 1, 0].map((n, i) => P('cerdo-en-pie', 'Cerdo en pie', 'libra', [1.05, 1.05, 1.02, 1.0, 1.0, 0.98, 0.98][i], 'Reporte de productores', n, { province: 'Coclé' })),
  ...[6, 5, 4, 3, 2, 1, 0].map((n, i) => P('name', 'Ñame', 'quintal', [40, 40, 39, 38, 38, 37, 38][i], 'Plataforma (referencia)', n, { province: 'Coclé' })),
  ...[6, 5, 4, 3, 2, 1, 0].map((n, i) => P('novillo', 'Novillo gordo en pie', 'libra', [1.4, 1.42, 1.42, 1.43, 1.45, 1.45, 1.46][i], 'Reporte de productores', n, { market: 'Subasta' })),
  ...[6, 5, 4, 3, 2, 1, 0].map((n, i) => P('yuca', 'Yuca', 'quintal', [24, 24, 25, 25, 25, 26, 26][i], 'Reporte de productores', n)),
]

export const comments = [
  { id: 'c1', listing_id: 'l1', network: 'facebook', author_name: 'Carlos M.', message: '¿Hacen entrega en Aguadulce? Necesito 5 lechones.', created_at: daysAgo(0.2), reply: null },
  { id: 'c2', listing_id: 'l1', network: 'instagram', author_name: 'agro.vera', message: 'Precio por 10?', created_at: daysAgo(0.6), reply: 'Hola, te escribimos por WhatsApp con el precio por volumen.', replied_at: daysAgo(0.5) },
  { id: 'c3', listing_id: 'l2', network: 'facebook', author_name: 'Mini súper La Esperanza', message: '¿Tienen 20 quintales para el viernes?', created_at: daysAgo(1), reply: null },
]

export const social_posts = [
  { id: 's1', listing_id: 'l1', network: 'facebook', status: 'publicado', permalink: '#', created_at: daysAgo(2) },
  { id: 's2', listing_id: 'l1', network: 'instagram', status: 'publicado', permalink: '#', created_at: daysAgo(2) },
  { id: 's3', listing_id: 'l2', network: 'facebook', status: 'publicado', permalink: '#', created_at: daysAgo(3) },
  { id: 's4', listing_id: 'l4', network: 'instagram', status: 'pendiente', created_at: daysAgo(1) },
]

export const ad_slots = [
  { id: 'a1', placement: 'home_top', advertiser: 'Espacio disponible', image_url: '', link_url: '', active: true, impressions: 0, clicks: 0, starts_at: dateAgo(0) },
]

export const reports = [
  { id: 'r1', listing_id: 'l5', reason: 'Precio sospechoso', details: 'Ejemplo de reporte', status: 'abierto', created_at: daysAgo(0.3) },
]
