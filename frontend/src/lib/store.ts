import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Cookies from 'js-cookie'
import { User } from '@/types'
import { authApi } from '@/lib/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username, password) => {
        set({ isLoading: true })
        try {
          const { data } = await authApi.login(username, password)
          Cookies.set('access_token', data.access, { expires: 1 })
          Cookies.set('refresh_token', data.refresh, { expires: 7 })
          set({ user: data.user, isAuthenticated: true, isLoading: false })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: async () => {
        const refresh = Cookies.get('refresh_token')
        if (refresh) {
          try { await authApi.logout(refresh) } catch {}
        }
        Cookies.remove('access_token')
        Cookies.remove('refresh_token')
        set({ user: null, isAuthenticated: false })
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'solarhope-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
