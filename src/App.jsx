import { Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Header, Footer } from './components/ui'
import { Home, Search, ListingPage, FarmPage, Farms, FarmsMapPage, Prices, ProductPrice, Safety, Privacy, NotFound } from './pages/public'
import { Login, Publish, Dashboard } from './pages/account'
import Admin from './pages/admin/Admin'

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/buscar" element={<Search />} />
          <Route path="/c/:cat" element={<Search />} />
          <Route path="/c/:cat/:prov" element={<Search />} />
          <Route path="/anuncio/:slug" element={<ListingPage />} />
          <Route path="/finca/:slug" element={<FarmPage />} />
          <Route path="/fincas" element={<Farms />} />
          <Route path="/mapa" element={<FarmsMapPage />} />
          <Route path="/precios" element={<Prices />} />
          <Route path="/precios/:slug" element={<ProductPrice />} />
          <Route path="/seguridad" element={<Safety />} />
          <Route path="/privacidad" element={<Privacy />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/publicar" element={<Publish />} />
          <Route path="/panel/*" element={<Dashboard />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
