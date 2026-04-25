'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { activityApi, authApi } from '@/lib/api'
import { ActivityLog, ActivitySummary, User } from '@/types'
import { formatDateTime } from '@/lib/utils'
import {
  Activity, LogIn, LogOut, Plus, Edit, Trash2, ArrowRightLeft,
  Send, KeyRound, Coins, CheckCircle, XCircle, Search, Filter, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Action config ─────────────────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  login:         { label: 'Login',         color: 'text-blue-700',   bg: 'bg-blue-100',   icon: LogIn },
  logout:        { label: 'Logout',        color: 'text-gray-600',   bg: 'bg-gray-100',   icon: LogOut },
  create:        { label: 'Create',        color: 'text-green-700',  bg: 'bg-green-100',  icon: Plus },
  update:        { label: 'Update',        color: 'text-amber-700',  bg: 'bg-amber-100',  icon: Edit },
  delete:        { label: 'Delete',        color: 'text-red-700',    bg: 'bg-red-100',    icon: Trash2 },
  status_change: { label: 'Status',        color: 'text-purple-700', bg: 'bg-purple-100', icon: ArrowRightLeft },
  send:          { label: 'Send',          color: 'text-sky-700',    bg: 'bg-sky-100',    icon: Send },
  reset_pin:     { label: 'Reset PIN',     color: 'text-orange-700', bg: 'bg-orange-100', icon: KeyRound },
  mark_paid:     { label: 'Mark Paid',     color: 'text-emerald-700',bg: 'bg-emerald-100',icon: Coins },
  approve:       { label: 'Approve',       color: 'text-green-700',  bg: 'bg-green-100',  icon: CheckCircle },
  reject:        { label: 'Reject',        color: 'text-red-700',    bg: 'bg-red-100',    icon: XCircle },
}

const RESOURCE_LABELS: Record<string, string> = {
  client: 'Client', quote: 'Quote', payment: 'Payment',
  installation: 'Installation', product: 'Product', survey: 'Survey',
  warranty: 'Warranty', referral: 'Referral', user: 'User',
  commission: 'Commission', '': 'System',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  sales: 'bg-blue-100 text-blue-700',
  field_agent: 'bg-amber-100 text-amber-700',
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ActivityPage() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [resourceType, setResourceType] = useState('')
  const [userId, setUserId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const params: Record<string, string> = { page: String(page) }
  if (search)       params.search        = search
  if (action)       params.action        = action
  if (resourceType) params.resource_type = resourceType
  if (userId)       params.user_id       = userId
  if (dateFrom)     params.date_from     = dateFrom
  if (dateTo)       params.date_to       = dateTo

  const { data, isLoading } = useQuery({
    queryKey: ['activity', params],
    queryFn: async () => (await activityApi.list(params)).data,
  })

  const { data: summaryData } = useQuery<ActivitySummary>({
    queryKey: ['activity-summary'],
    queryFn: async () => (await activityApi.summary()).data,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => (await authApi.users.list()).data,
  })

  const logs: ActivityLog[] = data?.results ?? []
  const total: number = data?.count ?? 0
  const totalPages = Math.ceil(total / 20)
  const users: User[] = usersData?.results ?? usersData ?? []

  const resetFilters = () => {
    setSearch(''); setAction(''); setResourceType('')
    setUserId(''); setDateFrom(''); setDateTo(''); setPage(1)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Activity Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            {summaryData ? `${summaryData.total.toLocaleString()} total events · ${summaryData.today} today` : 'All actions by all users'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity size={16} className="text-[#EA9D13]" />
          Real-time audit trail
        </div>
      </div>

      {/* Summary cards */}
      {summaryData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summaryData.by_action.slice(0, 4).map(({ action: a, count }) => {
            const cfg = ACTION_CONFIG[a] ?? ACTION_CONFIG.update
            const Icon = cfg.icon
            return (
              <button
                key={a}
                onClick={() => { setAction(a === action ? '' : a); setPage(1) }}
                className={cn(
                  'card text-left transition-all border-2',
                  action === a ? 'border-[#EA9D13]' : 'border-transparent'
                )}
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', cfg.bg)}>
                  <Icon size={15} className={cfg.color} />
                </div>
                <p className="text-xl font-bold text-gray-900">{count.toLocaleString()}</p>
                <p className="text-xs text-gray-500 capitalize">{cfg.label}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          <Filter size={14} /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search description, user..."
              className="input pl-9 text-sm"
            />
          </div>

          {/* Action */}
          <select
            value={action}
            onChange={e => { setAction(e.target.value); setPage(1) }}
            className="input text-sm"
          >
            <option value="">All actions</option>
            {Object.entries(ACTION_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Resource type */}
          <select
            value={resourceType}
            onChange={e => { setResourceType(e.target.value); setPage(1) }}
            className="input text-sm"
          >
            <option value="">All resources</option>
            {Object.entries(RESOURCE_LABELS).filter(([k]) => k).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {/* User */}
          <select
            value={userId}
            onChange={e => { setUserId(e.target.value); setPage(1) }}
            className="input text-sm"
          >
            <option value="">All users</option>
            {users.map((u: User) => (
              <option key={u.id} value={String(u.id)}>{u.full_name} ({u.role})</option>
            ))}
          </select>

          {/* Date from */}
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1) }}
            className="input text-sm"
          />

          {/* Date to */}
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1) }}
            className="input text-sm"
          />
        </div>

        {(search || action || resourceType || userId || dateFrom || dateTo) && (
          <button onClick={resetFilters} className="text-xs text-gray-400 hover:text-gray-600 underline">
            Clear all filters
          </button>
        )}
      </div>

      {/* Log feed */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : logs.length === 0 ? (
        <div className="card text-center py-16">
          <Activity size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No activity found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {logs.map(log => {
              const cfg = ACTION_CONFIG[log.action] ?? ACTION_CONFIG.update
              const Icon = cfg.icon
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                  {/* Action icon */}
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', cfg.bg)}>
                    <Icon size={14} className={cfg.color} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{log.description}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {log.user_name && (
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-gray-700">{log.user_name}</span>
                          <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', ROLE_COLORS[log.user_role] ?? 'bg-gray-100 text-gray-600')}>
                            {log.user_role}
                          </span>
                        </span>
                      )}
                      {log.resource_label && (
                        <span className="text-xs text-gray-400 truncate max-w-48">{log.resource_label}</span>
                      )}
                      {log.ip_address && (
                        <span className="text-xs text-gray-300 font-mono hidden sm:block">{log.ip_address}</span>
                      )}
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="shrink-0 text-right">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
                    {log.resource_type && (
                      <p className="text-xs text-gray-400 mt-1 capitalize">{RESOURCE_LABELS[log.resource_type] ?? log.resource_type}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(log.created_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">{total.toLocaleString()} events · page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-outline py-1.5 px-3 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-outline py-1.5 px-3 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
