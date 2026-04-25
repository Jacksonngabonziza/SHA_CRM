import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import Cookies from 'js-cookie'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = Cookies.get('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Let the browser set Content-Type automatically for FormData (preserves the boundary)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = Cookies.get('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh })
          Cookies.set('access_token', data.access, { expires: 1 })
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          Cookies.remove('access_token')
          Cookies.remove('refresh_token')
          globalThis.location.href = '/login'
        }
      } else {
        globalThis.location.href = '/login'
      }
    }
    throw error
  }
)

export default api

/**
 * Download a CSV from an authenticated endpoint.
 * Uses fetch with the stored access token so the JWT auth header is sent.
 */
export async function downloadCsv(url: string, filename: string) {
  const token = Cookies.get('access_token')
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error('Export failed')
  const blob = await response.blob()
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login/', { username, password }),
  logout: (refresh: string) =>
    api.post('/auth/logout/', { refresh }),
  me: () => api.get('/auth/me/'),
  updateMe: (data: Record<string, unknown>) =>
    api.patch('/auth/me/', data),
  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post('/auth/change-password/', data),
  users: {
    list: (params?: Record<string, string>) =>
      api.get('/auth/users/', { params }),
    get: (id: number) => api.get(`/auth/users/${id}/`),
    create: (data: Record<string, unknown>) =>
      api.post('/auth/users/', data),
    update: (id: number, data: Record<string, unknown>) =>
      api.put(`/auth/users/${id}/`, data),
    patch: (id: number, data: Record<string, unknown>) =>
      api.patch(`/auth/users/${id}/`, data),
    delete: (id: number) => api.delete(`/auth/users/${id}/`),
  },
  agentLogin: (phone: string, pin: string) =>
    api.post('/auth/agent-login/', { phone, pin }),
}

// ── Agents ────────────────────────────────────────────────────────────────────
export const agentsApi = {
  list: () => api.get('/auth/agents/'),
  get: (id: number) => api.get(`/auth/agents/${id}/`),
  create: (data: Record<string, unknown>) => api.post('/auth/agents/', data),
  patch: (id: number, data: Record<string, unknown>) => api.patch(`/auth/agents/${id}/`, data),
  delete: (id: number) => api.delete(`/auth/agents/${id}/`),
  resetPin: (id: number, pin: string) => api.post(`/auth/agents/${id}/reset-pin/`, { pin }),
  commissions: (id: number) => api.get(`/auth/agents/${id}/commissions/`),
  markCommissionPaid: (commissionId: number, notes?: string) =>
    api.post(`/auth/commissions/${commissionId}/mark-paid/`, { notes }),
  // Commission tiers
  tiers: {
    list: () => api.get('/auth/commission-tiers/'),
    create: (data: Record<string, unknown>) => api.post('/auth/commission-tiers/', data),
    update: (id: number, data: Record<string, unknown>) => api.put(`/auth/commission-tiers/${id}/`, data),
    delete: (id: number) => api.delete(`/auth/commission-tiers/${id}/`),
  },
  // Agent self-service
  me: () => api.get('/auth/agent/me/'),
  myClients: () => api.get('/auth/agent/clients/'),
  myCommissions: () => api.get('/auth/agent/commissions/'),
}

// ── Products ──────────────────────────────────────────────────────────────────
export const productsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/products/', { params }),
  byCategory: () => api.get('/products/by-category/'),
  get: (id: number) => api.get(`/products/${id}/`),
  create: (data: FormData | Record<string, unknown>) =>
    api.post('/products/', data),
  update: (id: number, data: FormData | Record<string, unknown>) =>
    api.put(`/products/${id}/`, data),
  patch: (id: number, data: Record<string, unknown>) =>
    api.patch(`/products/${id}/`, data),
  delete: (id: number) => api.delete(`/products/${id}/`),
  lowStock: () => api.get('/products/low-stock/'),
  compatiblePanels: (generatorId: number) =>
    api.get(`/products/${generatorId}/compatible-panels/`),
}

// ── Clients ───────────────────────────────────────────────────────────────────
export const clientsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/clients/', { params }),
  get: (id: number) => api.get(`/clients/${id}/`),
  create: (data: Record<string, unknown>) =>
    api.post('/clients/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/clients/${id}/`, data),
  patch: (id: number, data: Record<string, unknown>) =>
    api.patch(`/clients/${id}/`, data),
  delete: (id: number) => api.delete(`/clients/${id}/`),
  updateStatus: (id: number, status: string, followup_date?: string) =>
    api.patch(`/clients/${id}/status/`, { status, followup_date }),
  notes: (id: number) => api.get(`/clients/${id}/notes/`),
  addNote: (id: number, note: string) =>
    api.post(`/clients/${id}/notes/`, { note }),
  followupsDue: () => api.get('/clients/followups/'),
  exportUrl: () => `${BASE_URL}/clients/export/`,
}

// ── Quotes ────────────────────────────────────────────────────────────────────
export const quotesApi = {
  list: (params?: Record<string, string>) =>
    api.get('/quotes/', { params }),
  get: (id: number) => api.get(`/quotes/${id}/`),
  create: (data: Record<string, unknown>) =>
    api.post('/quotes/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/quotes/${id}/`, data),
  delete: (id: number) => api.delete(`/quotes/${id}/`),
  calculate: (data: Record<string, unknown>) =>
    api.post('/quotes/calculate/', data),
  updateStatus: (id: number, status: string) =>
    api.patch(`/quotes/${id}/status/`, { status }),
  pdfUrl: (id: number) => `${BASE_URL}/quotes/${id}/pdf/`,
  shared: (token: string) =>
    api.get(`/quotes/shared/${token}/`),
  submitFeedback: (token: string, data: Record<string, unknown>) =>
    api.post(`/quotes/shared/${token}/feedback/`, data),
  email: (id: number, email?: string) =>
    api.post(`/quotes/${id}/email/`, email ? { email } : {}),
  whatsapp: (id: number) =>
    api.get(`/quotes/${id}/whatsapp/`),
  createVersion: (id: number) =>
    api.post(`/quotes/${id}/version/`),
  exportUrl: () => `${BASE_URL}/quotes/export/`,
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats/'),
}

// ── Installations ─────────────────────────────────────────────────────────────
export const warrantyApi = {
  list: (params?: Record<string, string>) =>
    api.get('/installations/warranty/', { params }),
  get: (id: number) => api.get(`/installations/warranty/${id}/`),
  create: (data: Record<string, unknown>) =>
    api.post('/installations/warranty/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/installations/warranty/${id}/`, data),
  resolve: (id: number, resolution_notes: string) =>
    api.post(`/installations/warranty/${id}/resolve/`, { resolution_notes }),
  delete: (id: number) => api.delete(`/installations/warranty/${id}/`),
}

export const installationsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/installations/', { params }),
  get: (id: number) => api.get(`/installations/${id}/`),
  create: (data: Record<string, unknown>) =>
    api.post('/installations/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/installations/${id}/`, data),
  patch: (id: number, data: Record<string, unknown>) =>
    api.patch(`/installations/${id}/`, data),
  addLog: (id: number, note?: string, created_at?: string) =>
    api.post(`/installations/${id}/logs/`, { note, ...(created_at ? { created_at } : {}) }),
  updateLog: (id: number, logId: number, data: { note?: string; created_at?: string }) =>
    api.patch(`/installations/${id}/logs/${logId}/`, data),
  deleteLog: (id: number, logId: number) =>
    api.delete(`/installations/${id}/logs/${logId}/`),
  updateStatus: (id: number, status: string) =>
    api.patch(`/installations/${id}/status/`, { status }),
  reportUrl: (id: number) => `${BASE_URL}/installations/${id}/report/`,
}

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/payments/', { params }),
  get: (id: number) => api.get(`/payments/${id}/`),
  create: (data: Record<string, unknown>) =>
    api.post('/payments/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/payments/${id}/`, data),
  patch: (id: number, data: Record<string, unknown>) =>
    api.patch(`/payments/${id}/`, data),
  delete: (id: number) => api.delete(`/payments/${id}/`),
  quoteSummary: (quoteId: number) =>
    api.get(`/payments/quote/${quoteId}/summary/`),
  exportUrl: () => `${BASE_URL}/payments/export/`,
}

// ── Surveys ───────────────────────────────────────────────────────────────────
export const surveysApi = {
  list: (params?: Record<string, string>) =>
    api.get('/surveys/', { params }),
  get: (id: number) => api.get(`/surveys/${id}/`),
  create: (data: Record<string, unknown>) =>
    api.post('/surveys/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/surveys/${id}/`, data),
  patch: (id: number, data: Record<string, unknown>) =>
    api.patch(`/surveys/${id}/`, data),
  delete: (id: number) => api.delete(`/surveys/${id}/`),
}

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsApi = {
  monthly: (params?: { year?: number; month?: number }) =>
    api.get('/reports/monthly/', { params }),
  revenue: () => api.get('/reports/revenue/'),
}

// ── Company Settings ──────────────────────────────────────────────────────────
export const companySettingsApi = {
  get: () => api.get('/auth/company-settings/'),
  update: (data: Record<string, unknown>) => api.patch('/auth/company-settings/', data),
}

// ── Referrals ─────────────────────────────────────────────────────────────────
export const referralsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/referrals/', { params }),
  get: (id: number) => api.get(`/referrals/${id}/`),
  create: (data: Record<string, unknown>) =>
    api.post('/referrals/', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/referrals/${id}/`, data),
  patch: (id: number, data: Record<string, unknown>) =>
    api.patch(`/referrals/${id}/`, data),
  delete: (id: number) => api.delete(`/referrals/${id}/`),
}

// ── Activity Log ──────────────────────────────────────────────────────────────
export const activityApi = {
  list: (params?: Record<string, string>) => api.get('/activity/', { params }),
  summary: () => api.get('/activity/summary/'),
}
