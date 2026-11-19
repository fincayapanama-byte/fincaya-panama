import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'

const Ctx = createContext({ user: null, loading: true, favs: [], toggleFav: () => {} })
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [favs, setFavs] = useState([])
  useEffect(() => {
    api.currentUser().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false))
    return api.onAuth(setUser)
  }, [])
  useEffect(() => { if (!loading) api.favoriteIds(user).then(setFavs).catch(() => {}) }, [user?.id, loading])
  const toggleFav = useCallback(async (id) => {
    const on = await api.toggleFavorite(user, id)
    setFavs((f) => (on ? [...f, id] : f.filter((x) => x !== id)))
  }, [user])
  return <Ctx.Provider value={{ user, loading, setUser, favs, toggleFav }}>{children}</Ctx.Provider>
}
